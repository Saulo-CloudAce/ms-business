import moment from 'moment'
import { isTypeInt, isTypeBoolean, isTypeDecimal, isTypeString, isTypeCep, isTypePhoneNumber, isValidDate, isTypeDate, isTypeCpfCnpj } from '../helpers/field-methods.js'
import QueryPredicateError from './query-predicate-error.js'
import { clearCPFCNPJ } from '../helpers/formatters.js'

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
  CONTAINS: 'CONTAINS',
  getCalcOperations: () => {
    return ['GREATER_THAN', 'LESS_THAN', 'EQUAL_CALC', 'GREATER_THAN_CALC', 'LESS_THAN_CALC']
  }
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

  getFieldsParsedToIgnore() {
    const fieldsParsed = []
    for (let i = 0; i < this.rulesGroup.length; i++) {
      const group = this.rulesGroup[i]

      for (const r of group.rules) {
        const templateField = this.templateFields[r.field]
        if (this._isSubField(r.field) && isTypeDate(templateField)) {
          const nameParts = r.field.split('.')
          const nameParsed = [...nameParts.slice(0, -1), `__parsed_${nameParts[nameParts.length - 1]}`].join('.')
          fieldsParsed.push(nameParsed)
        }
      }
    }

    return fieldsParsed
  }

  generateMongoQueryFieldParser() {
    const parsers = {}

    for (let i = 0; i < this.rulesGroup.length; i++) {
      const group = this.rulesGroup[i]

      const criterias = this._createParseMongoQuery(group.rules, group.condition)
      for (const k of Object.keys(criterias)) {
        parsers[k] = criterias[k]
      }
    }

    return parsers
  }

  _createParseMongoQuery(rules = [], groupCondition = '') {
    const parsers = {}

    for (let i = 0; i < rules.length; i++) {
      let rule = rules[i]
      const templateField = this.templateFields[rule.field]

      rule = this._convertTypeValueToFieldType(rule, templateField)

      if (this._isSubField(rule.field)) {
        const fieldsParts = rule.field.split('.')
        const firstField = fieldsParts[0]
        const field = this.template.fields.find((f) => f.column == firstField)
        const nameFieldParser = `${fieldsParts[0]}`
        const objMap = {
          $map: {
            input: `$${firstField}`,
            as: `${firstField}`,
            in: this._mapSubfields(fieldsParts.slice(1), field, field.fields, firstField)
          }
        }
        const filterConditions = this._translateFilterMapMongoQuery(rule, rules, groupCondition, templateField)
        console.log(JSON.stringify(filterConditions))
        const objFilter = {
          $filter: {
            input: objMap,
            as: `${firstField}`,
            cond: {
              $and: [filterConditions]
            }
          }
        }
        parsers[nameFieldParser] = objFilter
      } else if (isTypeDate(templateField)) {
        const nameFieldParser = `__parsed_${rule.field}`
        parsers[nameFieldParser] = this._createParseDateFromString(rule, templateField)
      }
    }

    return parsers
  }

  _translateFilterMapMongoQuery(rule = {}, rules = [], groupCondition = '', templateField = {}) {
    const prefix = `${rule.field.split('.').slice(0, -1).join('.')}.`
    const rulesSameObject = rules.filter((r) => r.field.search(prefix) === 0)
    const filters = []
    for (const r of rulesSameObject) {
      const fieldParts = r.field.split('.')
      const lastField = `__parsed_${fieldParts[fieldParts.length - 1]}`
      const nameParsed = [...fieldParts.slice(0, -1), lastField].join('.')

      let expFilter

      if (r.condition === comparatorConditions.GREATER_THAN) {
        expFilter = this._buildGreaterthanFilterMongoQuery(nameParsed, r, templateField)
      } else if (r.condition === comparatorConditions.LESS_THAN) {
        expFilter = this._buildLessthanFilterMongoQuery(nameParsed, r, templateField)
      } else if (r.condition === comparatorConditions.EQUAL) {
        expFilter = this._buildEqualFilterMongoQuery(nameParsed, r, templateField)
      } else if (r.condition === comparatorConditions.EQUAL_CALC) {
        expFilter = this._buildEqualCalcFilterMongoQuery(nameParsed, r, templateField)
      } else if (r.condition === comparatorConditions.DIFFERENT) {
        expFilter = this._buildDifferentFilterMongoQuery(nameParsed, r, templateField)
      } else if (r.condition === comparatorConditions.GREATER_THAN_CALC) {
        expFilter = this._buildGreaterthanCalcFilterMongoQuery(nameParsed, r, templateField)
      } else if (r.condition === comparatorConditions.LESS_THAN_CALC) {
        expFilter = this._buildLessthanCalcFilterMongoQuery(nameParsed, r, templateField)
      }

      filters.push(expFilter)
    }

    let operator = '$and'
    if (groupCondition === connectConditions.OR) {
      operator = '$or'
    }
    const obj = {}
    obj[operator] = filters

    return obj
  }

  _mapSubfields(fieldPaths = [], parentField = {}, fields = [], prefixParsed = '') {
    const fieldname = fieldPaths[0]
    const field = fields.find((f) => f.column == fieldname)
    if (fieldPaths.length === 1) {
      const obj = {}
      for (let field of fields) {
        obj[field.column] = `$$${parentField.column}.${field.column}`
        if (field.column === fieldname && isTypeDate(field)) {
          const nameParsed = `__parsed_${fieldname}`
          const fieldParsed = this._createParseDateFromString({ field: fieldname }, field, prefixParsed)

          obj[nameParsed] = fieldParsed
        }
      }

      const objParsed = {
        $map: {
          input: `$${parentField.column}`,
          as: `${parentField.column}`,
          in: obj
        }
      }

      return obj
    }

    const parsedname = `${fieldname}`
    const obj = {}
    const objMap = {
      $map: {
        input: `$$${parentField.column}.${fieldname}`,
        as: `${fieldname}`,
        in: this._mapSubfields(fieldPaths.slice(1), field, field.fields, fieldname)
      }
    }
    obj[parsedname] = objMap
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
        const criterias = this._translateRulesToCriteriaMongoQuery(group.rules, group.condition)
        if (criterias.length) {
          query.push({ $and: criterias })
        }
      } else if (group.condition === connectConditions.AND) {
        const criterias = this._translateRulesToCriteriaMongoQuery(group.rules, group.condition)
        if (criterias.length) {
          query.push({ $and: criterias })
        }
      } else if (group.condition === connectConditions.OR) {
        const criterias = this._translateRulesToCriteriaMongoQuery(group.rules, group.condition)
        if (criterias.length) {
          query.push({ $or: criterias })
        }
      }
    }

    return query
  }

  _translateRulesSublevelToCriteriaMongoQuery(rules = [], groupCondition = '') {
    const criterias = []
    const rulesIndexed = {}
    for (const r of rules) {
      if (!rulesIndexed[r.field]) {
        rulesIndexed[r.field] = []
      }
      rulesIndexed[r.field].push(r)
    }

    for (const field of Object.keys(rulesIndexed)) {
      const fieldRules = rulesIndexed[field]

      const templateField = this.templateFields[field]

      const fieldParts = field.split('.')

      const fieldMongoQuery = this._translateSubLevelMongoQuery(fieldParts, fieldRules, templateField, groupCondition)
      criterias.push(fieldMongoQuery)
    }

    return criterias
  }

  _translateSubLevelMongoQuery(fieldPath = [], rules = [], templateField = {}, groupCondition = '') {
    if (fieldPath.length === 1) {
      const fieldNameParsed = isTypeDate(templateField) ? `__parsed_${fieldPath[0]}` : fieldPath[0]
      const criterias = []
      for (const r of rules) {
        const rule = this._convertTypeValueToFieldType(r, templateField)

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
          criterias.push(this._buildLessthanCalcCriteriaMongoQuery(rule, templateField))
        }
      }

      let fieldMongoQuery = {}
      const queries = criterias.map((o) => {
        return Object.values(o)[0]
      })

      if (groupCondition !== connectConditions.OR) {
        for (const q of queries) {
          if (Object.keys(q).includes('$ne')) {
            if (!fieldMongoQuery['$nin']) {
              fieldMongoQuery['$nin'] = []
            }
            fieldMongoQuery['$nin'].push(q['$ne'])
          } else if (!(q instanceof Object) || Object.keys(q).length === 0) {
            if (!fieldMongoQuery['$in']) {
              fieldMongoQuery['$in'] = []
            }
            fieldMongoQuery['$in'].push(q)
          } else {
            fieldMongoQuery = Object.assign(fieldMongoQuery, q)
          }
        }

        const obj = {}

        obj[fieldNameParsed] = fieldMongoQuery

        return obj
      }
      fieldMongoQuery['$or'] = []
      for (const q of queries) {
        const objItem = {}
        objItem[fieldNameParsed] = q
        fieldMongoQuery['$or'].push(objItem)
      }

      return fieldMongoQuery
    }

    const obj = {}
    const subQuery = this._translateSubLevelMongoQuery(fieldPath.slice(1), rules, templateField, groupCondition)
    const fieldNameParsed = isTypeDate(templateField) ? `${fieldPath[0]}` : fieldPath[0]
    obj[fieldNameParsed] = { $elemMatch: subQuery }

    return obj
  }

  _translateRulesToCriteriaMongoQuery(rules = [], groupCondition = '') {
    const rulesSubLevel = rules.filter((r) => r.field.includes('.'))
    const rulesFirstLevel = rules.filter((r) => !r.field.includes('.'))
    const criterias = []
    const criteriasSubLevel = this._translateRulesSublevelToCriteriaMongoQuery(rulesSubLevel, groupCondition)
    criterias.push(...criteriasSubLevel)

    for (let i = 0; i < rulesFirstLevel.length; i++) {
      let rule = rulesFirstLevel[i]
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
        criterias.push(this._buildLessthanCalcCriteriaMongoQuery(rule, templateField))
      }
    }

    return criterias
  }

  _buildEqualCriteriaMongoQuery(rule = {}, field = {}) {
    const criteria = {}

    if (isTypeDate(field)) {
      const valueDate = moment(rule.value).format(field.mask)
      criteria[rule.field] = valueDate
    } else if (this._isSubField(rule.field)) {
      criteria[rule.field] = { $eq: rule.value }
    } else {
      criteria[rule.field] = rule.value
    }

    return criteria
  }

  _buildEqualFilterMongoQuery(fieldname = '', rule = {}, field = {}) {
    const criteria = {}

    if (isTypeDate(field)) {
      const valueDate = moment(rule.value).format(field.mask)
      criteria['$eq'] = [`$$${rule.field}`, valueDate]
    } else {
      criteria['$eq'] = [`$$${rule.field}`, rule.value]
    }

    return criteria
  }

  _buildEqualCalcCriteriaMongoQuery(rule = {}, field = {}) {
    const criteria = {}
    if (isTypeDate(field)) {
      const today = rule.base_date ? rule.base_date : moment()

      let compDate = today
      if (String(rule.value)[0] === '+') {
        compDate = today.add(parseInt(rule.value.replace('+', '')), 'days')
      } else if (String(rule.value)[0] === '-') {
        compDate = today.subtract(parseInt(rule.value.replace('-', '')), 'days')
      } else {
        compDate = today.add(parseInt(rule.value), 'days')
      }
      compDate = new Date(today.format('YYYY-MM-DD')) // today.format(field.mask)

      const criteria = {}
      const fieldNameParsed = `__parsed_${rule.field}`
      criteria[fieldNameParsed] = compDate
      return criteria
    }

    criteria[rule.field] = rule.value
    return criteria
  }

  _buildEqualCalcFilterMongoQuery(fieldname = '', rule = {}, field = {}) {
    const criteria = {}
    if (isTypeDate(field)) {
      const today = rule.base_date ? rule.base_date : moment()

      let compDate = today
      if (String(rule.value)[0] === '+') {
        compDate = today.add(parseInt(rule.value.replace('+', '')), 'days')
      } else if (String(rule.value)[0] === '-') {
        compDate = today.subtract(parseInt(rule.value.replace('-', '')), 'days')
      } else {
        compDate = today.add(parseInt(rule.value), 'days')
      }
      compDate = new Date(today.format('YYYY-MM-DD')) // today.format(field.mask)

      const criteria = {}
      criteria['$eq'] = [`$$${fieldname}`, compDate]
      return criteria
    }

    criteria['$eq'] = [`$$${rule.field}`, rule.value]
    return criteria
  }

  _buildDifferentCriteriaMongoQuery(rule = {}, field = {}) {
    const criteria = {}
    criteria[rule.field] = { $ne: rule.value }
    return criteria
  }

  _buildDifferentFilterMongoQuery(fieldname = '', rule = {}, field = {}) {
    const criteria = {}
    criteria['$ne'] = [`$$${rule.field}`, rule.value]
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

  _buildGreaterthanFilterMongoQuery(fieldname = '', rule = {}, field = {}) {
    const criteria = {}

    if (isTypeDate(field)) {
      criteria['$gte'] = [`$$${fieldname}`, new Date(rule.value)]
    } else {
      criteria['$gte'] = [`$$${rule.field}`, rule.value]
    }

    return criteria
  }

  _buildGreaterthanCalcCriteriaMongoQuery(rule = {}, field = {}) {
    const criteria = {}
    if (isTypeDate(field)) {
      const today = moment()
      let compDate = today
      if (String(rule.value)[0] === '+') {
        compDate = today.add(parseInt(rule.value.replace('+', '')), 'days')
      } else if (String(rule.value)[0] === '-') {
        compDate = today.subtract(parseInt(rule.value.replace('-', '')), 'days')
      } else {
        compDate = today.add(parseInt(rule.value), 'days')
      }
      compDate = new Date(today.format('YYYY-MM-DD')) // today.format(field.mask)
      const fieldNameParsed = `__parsed_${rule.field}`
      criteria[fieldNameParsed] = { $gte: compDate }
      return criteria
    }

    criteria[rule.field] = { $gte: rule.value }
    return criteria
  }

  _buildGreaterthanCalcFilterMongoQuery(fieldname = '', rule = {}, field = {}) {
    const criteria = {}
    if (isTypeDate(field)) {
      const today = moment()
      let compDate = today
      if (String(rule.value)[0] === '+') {
        compDate = today.add(parseInt(rule.value.replace('+', '')), 'days')
      } else if (String(rule.value)[0] === '-') {
        compDate = today.subtract(parseInt(rule.value.replace('-', '')), 'days')
      } else {
        compDate = today.add(parseInt(rule.value), 'days')
      }
      compDate = new Date(today.format('YYYY-MM-DD')) // today.format(field.mask)

      criteria['$gte'] = [`$$${fieldname}`, compDate]
      return criteria
    }

    criteria['$gte'] = [`$$${rule.field}`, rule.value]
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

  _buildLessthanFilterMongoQuery(fieldname = '', rule = {}, field = {}) {
    const criteria = {}

    if (isTypeDate(field)) {
      criteria['$lte'] = [`$$${fieldname}`, new Date(rule.value)]
    } else {
      criteria['$lte'] = [`$$${rule.field}`, rule.value]
    }

    return criteria
  }

  _buildLessthanCalcCriteriaMongoQuery(rule = {}, field = {}) {
    const criteria = {}
    if (isTypeDate(field)) {
      const today = moment()
      let compDate = today
      if (String(rule.value)[0] === '+') {
        compDate = today.add(parseInt(rule.value.replace('+', '')), 'days')
      } else if (String(rule.value)[0] === '-') {
        compDate = today.subtract(parseInt(rule.value.replace('-', '')), 'days')
      } else if (parseInt(rule.value) > 0) {
        compDate = today.add(parseInt(rule.value), 'days')
      }
      compDate = new Date(today.format('YYYY-MM-DD')) // today.format(field.mask)
      const fieldNameParsed = `__parsed_${rule.field}`
      criteria[fieldNameParsed] = { $lte: compDate }
      return criteria
    }

    criteria[rule.field] = { $lte: rule.value }
    return criteria
  }

  _buildLessthanCalcFilterMongoQuery(fieldname = '', rule = {}, field = {}) {
    const criteria = {}
    if (isTypeDate(field)) {
      const today = moment()
      let compDate = today
      if (String(rule.value)[0] === '+') {
        compDate = today.add(parseInt(rule.value.replace('+', '')), 'days')
      } else if (String(rule.value)[0] === '-') {
        compDate = today.subtract(parseInt(rule.value.replace('-', '')), 'days')
      } else if (parseInt(rule.value) > 0) {
        compDate = today.add(parseInt(rule.value), 'days')
      }
      compDate = new Date(today.format('YYYY-MM-DD')) // today.format(field.mask)

      criteria['$lte'] = [`$$${fieldname}`, compDate]
      return criteria
    }

    criteria['$lte'] = [`$$${rule.field}`, rule.value]
    return criteria
  }

  _convertTypeValueToFieldType(rule = {}, field = {}) {
    if (isTypeInt(field) && typeof rule.value !== 'number') {
      rule.value = parseInt(rule.value)
    } else if (isTypeBoolean(field) && typeof rule.value !== 'boolean') {
      rule.value = String(rule.value) === 'true'
    } else if (rule.condition === comparatorConditions.EQUAL && !this._isSubField(rule.field)) {
      if (isTypeString(field) || isTypeCep(field) || isTypePhoneNumber(field)) {
        rule.value = { $regex: String(rule.value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }
      } else if (isTypeCpfCnpj(field)) {
        rule.value = clearCPFCNPJ(rule.value.trim())
      }
    } else if (rule.condition === comparatorConditions.CONTAINS) {
      if (typeof rule.value != 'object') {
        rule.value = clearCPFCNPJ(rule.value.trim())
      }
      rule.value = { $regex: String(rule.value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }
    }

    return rule
  }

  isEmpty() {
    return !this.rulesGroup || !Array.isArray(this.rulesGroup) || this.rulesGroup.length === 0
  }
}
