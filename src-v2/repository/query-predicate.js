import {
  isTypeInt,
  isTypeBoolean,
  isTypeDecimal,
  isTypeString,
  isTypeCep,
  isTypeEmail,
  isTypePhoneNumber
} from '../helpers/field-methods.js'
import QueryPredicateError from './query-predicate-error.js'

const connectConditions = {
  AND: 'AND',
  OR: 'OR',
  ONLY: 'ONLY'
}

const comparatorConditions = {
  EQUAL: 'EQUAL',
  DIFFERENT: 'DIFFERENT',
  GREATER_THAN: 'GREATER_THAN',
  LESS_THAN: 'LESS_THAN'
}

export default class QueryPredicate {
  constructor(rulesGroup = [], template = {}) {
    this.templateFields = this._indexTemplateFields(template)

    this._validateRulesGroup(rulesGroup, this.templateFields)

    this.rulesGroup = rulesGroup
  }

  _indexTemplateFields(template = {}) {
    const templateFields = {}
    template.fields.forEach((field) => {
      templateFields[field.column] = field
    })

    return templateFields
  }

  _validateRulesGroup(rulesGroup = [], templateFields = {}) {
    if (!Array.isArray(rulesGroup)) throw new QueryPredicateError('O grupo de regras deve ser um array')

    rulesGroup.forEach((group) => {
      if (!group['condition']) throw new QueryPredicateError('A condição principal do conjunto de regras deve ser fornecida')
      if (!Object.keys(connectConditions).includes(group.condition))
        throw new QueryPredicateError(`A condição conectiva não é valida, apenas ${Object.keys(connectConditions).join(',')}`)
      if (!group.rules || group.rules.length === 0) throw new QueryPredicateError('O conjunto de regras é obrigatório')
      if (group.condition === connectConditions.ONLY && group.rules.length > 1)
        throw new QueryPredicateError('O conjunto de regras para o ONLY deve conter apenas uma regra')

      this._validateRules(group.rules, templateFields)
    })
  }

  _validateRules(rules = [], templateFields = {}) {
    rules.forEach((rule, index) => {
      const templateField = templateFields[rule.field]

      if (!rule.condition) throw new QueryPredicateError(`[${index}] A regra não tem condição`)
      if (!rule.field) throw new QueryPredicateError(`[${index}] A regra não tem campo de comparação`)
      if (!templateField) throw new QueryPredicateError(`[${index}] O field {${rule.field}} não existe no template`)
      if (!rule.value) throw new QueryPredicateError(`[${index}] A regra não tem valor de comparação`)
      if (!Object.keys(comparatorConditions).includes(rule.condition))
        throw new QueryPredicateError(
          `[${index}] A regra tem uma condição inválida. As condições validas são: ${Object.keys(comparatorConditions).join(',')}`
        )
      this._validateRuleValueType(rule, templateField, index)
    })
  }

  _validateRuleValueType(rule = {}, templateField = {}, ruleIndex = 0) {
    if (isTypeInt(templateField) && isNaN(rule.value))
      throw new Error(`[${ruleIndex}] O tipo de dados valor da regra é diferente do tipo de dados do campo no template`)
    if (isTypeBoolean(templateField) && !['true', 'false'].includes(String(rule.value)))
      throw new Error(`[${ruleIndex}] O tipo de dados valor da regra é diferente do tipo de dados do campo no template`)
    if (isTypeDecimal(templateField) && isNaN(rule.value))
      throw new Error(`[${ruleIndex}] O tipo de dados valor da regra é diferente do tipo de dados do campo no template`)
  }

  generateMongoQuery() {
    let query = []

    for (let i = 0; i < this.rulesGroup.length; i++) {
      const group = this.rulesGroup[i]

      if (group.condition === connectConditions.ONLY) {
        return this._translateRulesToCriteriaMongoQuery(group.rules)
      } else if (group.condition === connectConditions.AND) {
        const criterias = this._translateRulesToCriteriaMongoQuery(group.rules)
        query.push({ $and: criterias })
      } else if (group.condition === connectConditions.OR) {
        const criterias = this._translateRulesToCriteriaMongoQuery(group.rules)
        query.push({ $or: criterias })
      }
    }

    return query
  }

  _translateRulesToCriteriaMongoQuery(rules = []) {
    const criterias = []
    for (let i = 0; i < rules.length; i++) {
      let rule = rules[i]
      const templateField = this.templateFields[rule.field]

      rule = this._convertTypeValueToFieldType(rule, templateField)

      if (rule.condition === comparatorConditions.EQUAL) {
        criterias.push(this._buildEqualCriteriaMongoQuery(rule, templateField))
      } else if (rule.condition === comparatorConditions.DIFFERENT) {
        criterias.push(this._buildDifferentCriteriaMongoQuery(rule, templateField))
      } else if (rule.condition === comparatorConditions.GREATER_THAN) {
        criterias.push(this._buildGreaterthanCriteriaMongoQuery(rule, templateField))
      } else if (rule.condition === comparatorConditions.LESS_THAN) {
        criterias.push(this._buildLessthanCriteriaMongoQuery(rule, templateField))
      }
    }

    return criterias
  }

  _buildEqualCriteriaMongoQuery(rule = {}, field = {}) {
    const criteria = {}
    criteria[rule.field] = rule.value
    return criteria
  }

  _buildDifferentCriteriaMongoQuery(rule = {}, field = {}) {
    const criteria = {}
    criteria[rule.field] = { $ne: rule.value }
    return criteria
  }

  _buildGreaterthanCriteriaMongoQuery(rule = {}, field = {}) {
    const criteria = {}
    criteria[rule.field] = { $gte: rule.value }
    return criteria
  }

  _buildLessthanCriteriaMongoQuery(rule = {}, field = {}) {
    const criteria = {}
    criteria[rule.field] = { $lte: rule.value }
    return criteria
  }

  _convertTypeValueToFieldType(rule = {}, field = {}) {
    if (isTypeInt(field) && typeof rule.value !== 'number') {
      rule.value = parseInt(rule.value)
    } else if (
      rule.condition === comparatorConditions.EQUAL &&
      (isTypeString(field) || isTypeCep(field) || isTypeEmail(field) || isTypePhoneNumber(field))
    ) {
      rule.value = { $regex: rule.value, $options: 'i' }
    }

    return rule
  }

  isEmpty() {
    return !this.rulesGroup || !Array.isArray(this.rulesGroup) || this.rulesGroup.length === 0
  }
}