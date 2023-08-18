import moment from 'moment'
import { isTypeInt, isTypeBoolean, isTypeDecimal, isTypeString, isTypeCep, isTypePhoneNumber, isValidDate, isTypeDate } from '../helpers/field-methods.js'
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
  LESS_THAN: 'LESS_THAN',
  EQUAL_CALC: 'EQUAL_CALC',
  GREATER_THAN_CALC: 'GREATER_THAN_CALC',
  LESS_THAN_CALC: 'LESS_THAN_CALC',
  CONTAINS: 'CONTAINS'
}

export default class QueryPredicate {
  constructor(rulesGroup = [], template = {}) {
    this.template = template
    this.templateFields = this._indexTemplateFields(template)

    this._validateRulesGroup(rulesGroup, this.templateFields)

    this.rulesGroup = rulesGroup
  }

  _indexTemplateFields(template = {}) {
    const templateFields = {}
    const indexes = []

    template.fields.forEach((field) => {
      indexes.push(...this._getTemplateFields(field))
    })
    indexes.forEach((f) => {
      const k = Object.keys(f)[0]
      templateFields[k] = f[k]
    })

    return templateFields
  }

  _getTemplateFields(field = {}, prefix = '') {
    const indexes = []
    if (field.fields) {
      if (prefix.length === 0) {
        prefix = field.column
      } else {
        prefix += `.${field.column}`
      }
      field.fields.forEach((f) => {
        indexes.push(...this._getTemplateFields(f, prefix))
      })
    } else {
      const idx = {}
      if (prefix) {
        idx[`${prefix}.${field.column}`] = field
      } else {
        idx[field.column] = field
      }

      indexes.push(idx)
    }
    return indexes
  }

  _validateRulesGroup(rulesGroup = [], templateFields = {}) {
    if (!Array.isArray(rulesGroup)) throw new QueryPredicateError('O grupo de regras deve ser um array')

    rulesGroup.forEach((group) => {
      if (!group['condition']) throw new QueryPredicateError('A condição principal do conjunto de regras deve ser fornecida')
      if (!Object.keys(connectConditions).includes(group.condition)) throw new QueryPredicateError(`A condição conectiva não é valida, apenas ${Object.keys(connectConditions).join(',')}`)
      if (!group.rules || group.rules.length === 0) throw new QueryPredicateError('O conjunto de regras é obrigatório')
      if (group.condition === connectConditions.ONLY && group.rules.length > 1) throw new QueryPredicateError('O conjunto de regras para o ONLY deve conter apenas uma regra')

      this._validateRules(group.rules, templateFields)
    })
  }

  _validateRules(rules = [], templateFields = {}) {
    rules.forEach((rule, index) => {
      const templateField = templateFields[rule.field]

      if (!rule.condition) throw new QueryPredicateError(`[${index}] A regra não tem condição`)
      if (!rule.field) throw new QueryPredicateError(`[${index}] A regra não tem campo de comparação`)
      if (!templateField) throw new QueryPredicateError(`[${index}] O field {${rule.field}} não existe no template`)
      if (!Object.keys(rule).includes('value') || String(rule.value).trim().length === 0) throw new QueryPredicateError(`[${index}] A regra não tem valor de comparação`)
      if (!Object.keys(comparatorConditions).includes(rule.condition)) throw new QueryPredicateError(`[${index}] A regra tem uma condição inválida. As condições validas são: ${Object.keys(comparatorConditions).join(',')}`)
      this._validateRuleValueType(rule, templateField, index)
    })
  }

  _validateRuleValueType(rule = {}, templateField = {}, ruleIndex = 0) {
    if (isTypeDate(templateField) && [comparatorConditions.EQUAL, comparatorConditions.GREATER_THAN, comparatorConditions.LESS_THAN].includes(rule.condition)) {
      if (rule.value) {
        const date = rule.value.trim()
        if (!isValidDate(date, 'YYYY-MM-DD')) {
          throw new Error(`[${ruleIndex}] O valor não é uma data válida`)
        }
      } else {
        throw new Error(`[${ruleIndex}] O valor da data está vazio`)
      }
    }
    if (isTypeInt(templateField) && isNaN(rule.value)) throw new Error(`[${ruleIndex}] O tipo de dados valor da regra é diferente do tipo de dados do campo no template`)
    if (isTypeBoolean(templateField) && !['true', 'false'].includes(String(rule.value))) throw new Error(`[${ruleIndex}] O tipo de dados valor da regra é diferente do tipo de dados do campo no template`)
    if (isTypeDecimal(templateField) && isNaN(rule.value)) throw new Error(`[${ruleIndex}] O tipo de dados valor da regra é diferente do tipo de dados do campo no template`)
  }

  generateMongoQueryFieldParser() {
    const parsers = {}

    for (let i = 0; i < this.rulesGroup.length; i++) {
      const group = this.rulesGroup[i]

      const criterias = this._createParseMongoQuery(group.rules)
      for (const k of Object.keys(criterias)) {
        parsers[k] = criterias[k]
      }
    }

    return parsers
  }

  _createParseMongoQuery(rules = []) {
    const parsers = {}

    for (let i = 0; i < rules.length; i++) {
      let rule = rules[i]
      const templateField = this.templateFields[rule.field]

      rule = this._convertTypeValueToFieldType(rule, templateField)

      if (![comparatorConditions.GREATER_THAN, comparatorConditions.LESS_THAN].includes(rule.condition)) {
        continue
      }
      if (!isTypeDate(templateField)) {
        continue
      }

      if (this._isSubField(rule.field)) {
        const fieldsParts = rule.field.split('.')
        const firstField = fieldsParts[0]
        const field = this.template.fields.find((f) => f.column == firstField)
        const nameFieldParser = `__parsed_${fieldsParts[0]}`
        // const obj = {}
        parsers[nameFieldParser] = this._mapSubfields(fieldsParts.slice(1), field, field.fields, firstField)
      } else {
        const nameFieldParser = `__parsed_${rule.field}`
        parsers[nameFieldParser] = this._createParseDateFromString(rule, templateField)
      }
    }

    return parsers
  }

  _mapSubfields(fieldPaths = [], parentField = {}, fields = [], prefixParsed = '') {
    const fieldname = fieldPaths[0]
    const field = fields.find((f) => (f.column = fieldname))
    if (fieldPaths.length === 1) {
      const nameParsed = `__parsed_${fieldname}`
      const fieldParsed = this._createParseDateFromString({ field: fieldname }, field, prefixParsed)
      const obj = {}
      obj[nameParsed] = fieldParsed
      const objParsed = {
        $map: {
          input: `$${parentField.column}`,
          as: `${parentField.column}`,
          in: obj
        }
      }

      return objParsed
    }

    const parsedname = `__parsed_${fieldname}`
    const obj = {}
    obj[parsedname] = this._mapSubfields(fieldPaths.slice(1), field, field.fields, fieldname)
    return obj
  }

  _createParseDateFromString(rule = {}, templateField = {}, prefix = '') {
    const dateFormat = this._parseMaskToDateFormatMongo(templateField)
    let fieldPath = `${rule.field}`
    if (prefix.length) {
      fieldPath = `$${prefix}.${fieldPath}`
    }
    return {
      $dateFromString: {
        dateString: `$${fieldPath}`,
        format: dateFormat,
        onError: `$${fieldPath}`
      }
    }
  }

  _isSubField(fieldname = '') {
    const parts = String(fieldname).split('.')
    return parts.length > 1
  }

  _parseMaskToDateFormatMongo(templateField = {}) {
    if (templateField.mask === 'DD-MM-YYYY') {
      return '%d-%m-%Y'
    }
    if (templateField.mask === 'MM-DD-YYYY') {
      return '%m-%d-%Y'
    }
    if (templateField.mask === 'YYYY-MM-DD') {
      return '%Y-%m-%d'
    }
    if (templateField.mask === 'YYYY-DD-MM') {
      return '%Y-%d-%m'
    }
    if (templateField.mask === 'DD/MM/YYYY') {
      return '%d/%m/%Y'
    }
    if (templateField.mask === 'MM/DD/YYYY') {
      return '%m/%d/%Y'
    }
    if (templateField.mask === 'YYYY/MM/DD') {
      return '%Y/%m/%d'
    }
    if (templateField.mask === 'YYYY/DD/MM') {
      return '%Y/%d/%m'
    }

    return '%d/%m/%Y'
  }

  generateMongoQuery() {
    let query = []

    for (let i = 0; i < this.rulesGroup.length; i++) {
      const group = this.rulesGroup[i]

      if (group.condition === connectConditions.ONLY) {
        const criterias = this._translateRulesToCriteriaMongoQuery(group.rules)
        query.push({ $and: criterias })
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
      } else if (rule.condition === comparatorConditions.CONTAINS) {
        criterias.push(this._buildEqualCriteriaMongoQuery(rule, templateField))
      } else if (rule.condition === comparatorConditions.DIFFERENT) {
        criterias.push(this._buildDifferentCriteriaMongoQuery(rule, templateField))
      } else if (rule.condition === comparatorConditions.GREATER_THAN) {
        criterias.push(this._buildGreaterthanCriteriaMongoQuery(rule, templateField))
      } else if (rule.condition === comparatorConditions.LESS_THAN) {
        criterias.push(this._buildLessthanCriteriaMongoQuery(rule, templateField))
      } else if (rule.condition === comparatorConditions.EQUAL_CALC) {
        criterias.push(this._buildEqualCalcCriteriaMongoQuery(rule, templateField))
      } else if (rule.condition === comparatorConditions.GREATER_THAN_CALC) {
        criterias.push(this._buildGreaterthanCalcCriteriaMongoQuery(rule, templateField))
      } else if (rule.condition === comparatorConditions.LESS_THAN_CALC) {
        criterias.push(this._buildLessthanCriteriaMongoQuery(rule, templateField))
      }
    }

    return criterias
  }

  _buildEqualCriteriaMongoQuery(rule = {}, field = {}) {
    const criteria = {}

    if (isTypeDate(field)) {
      const valueDate = moment(rule.value).format(field.mask)
      criteria[rule.field] = valueDate
    } else {
      criteria[rule.field] = rule.value
    }

    return criteria
  }

  _buildEqualCalcCriteriaMongoQuery(rule = {}, field = {}) {
    const today = rule.base_date ? rule.base_date : moment()

    let compDate = today
    if (String(rule.value)[0] === '+') {
      compDate = today.add(parseInt(rule.value.replace('+', '')), 'days')
    } else if (String(rule.value)[0] === '-') {
      compDate = today.subtract(parseInt(rule.value.replace('-', '')), 'days')
    } else {
      compDate = today.add(parseInt(rule.value), 'days')
    }
    compDate = today.format(field.mask)

    const criteria = {}
    criteria[rule.field] = compDate
    return criteria
  }

  _buildDifferentCriteriaMongoQuery(rule = {}, field = {}) {
    const criteria = {}
    criteria[rule.field] = { $ne: rule.value }
    return criteria
  }

  _buildGreaterThanDateStatement(rule = {}, field = {}) {
    return { $gte: new Date(rule.value) }
  }

  _buildGreaterthanCriteriaMongoQuery(rule = {}, field = {}) {
    const criteria = {}

    if (isTypeDate(field)) {
      const valueDate = moment(rule.value).format(field.mask)
      let fieldnameParts = rule.field.split('.').map((f) => {
        return `__parsed_${f}`
      })
      const fieldParsed = fieldnameParts.join('.')
      criteria[fieldParsed] = this._buildGreaterThanDateStatement(rule, field)
    } else {
      criteria[rule.field] = { $gte: rule.value }
    }

    return criteria
  }

  _buildGreaterthanCalcCriteriaMongoQuery(rule = {}, field = {}) {
    const today = moment()
    let compDate = today
    if (String(rule.value)[0] === '+') {
      compDate = today.add(parseInt(rule.value.replace('+', '')), 'days')
    } else if (String(rule.value)[0] === '-') {
      compDate = today.subtract(parseInt(rule.value.replace('-', '')), 'days')
    } else {
      compDate = today.add(parseInt(rule.value), 'days')
    }
    compDate = today.format(field.mask)

    const criteria = {}
    criteria[rule.field] = { $gte: compDate }
    return criteria
  }

  _buildLessThanDateStatement(rule = {}, field = {}) {
    return { $lte: new Date(rule.value) }
  }

  _buildLessthanCriteriaMongoQuery(rule = {}, field = {}) {
    const criteria = {}

    if (isTypeDate(field)) {
      const valueDate = moment(rule.value).format(field.mask)
      let fieldnameParts = rule.field.split('.').map((f) => {
        return `__parsed_${f}`
      })
      const fieldParsed = fieldnameParts.join('.')
      criteria[fieldParsed] = this._buildLessThanDateStatement(rule, field)
    } else {
      criteria[rule.field] = { $lte: rule.value }
    }

    return criteria
  }

  _buildLessthanCalcCriteriaMongoQuery(rule = {}, field = {}) {
    const today = moment()
    let compDate = today
    if (String(rule.value)[0] === '+') {
      compDate = today.add(parseInt(rule.value.replace('+', '')), 'days')
    } else if (String(rule.value)[0] === '-') {
      compDate = today.subtract(parseInt(rule.value.replace('-', '')), 'days')
    } else {
      compDate = today.add(parseInt(rule.value), 'days')
    }
    compDate = today.format(field.mask)

    const criteria = {}
    criteria[rule.field] = { $lte: compDate }
    return criteria
  }

  _convertTypeValueToFieldType(rule = {}, field = {}) {
    if (isTypeInt(field) && typeof rule.value !== 'number') {
      rule.value = parseInt(rule.value)
    } else if (isTypeBoolean(field) && typeof rule.value !== 'boolean') {
      rule.value = String(rule.value) === 'true'
    } else if (rule.condition === comparatorConditions.EQUAL && (isTypeString(field) || isTypeCep(field) || isTypePhoneNumber(field))) {
      rule.value = new RegExp('^' + String(rule.value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i')
    } else if (rule.condition === comparatorConditions.CONTAINS) {
      rule.value = { $regex: String(rule.value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }
    }

    return rule
  }

  isEmpty() {
    return !this.rulesGroup || !Array.isArray(this.rulesGroup) || this.rulesGroup.length === 0
  }
}
