import { clearString } from '../helpers/formatters.js'
import { isArrayElementSameTypes, isArrayOfObjects, isArrayWithEmptyElement } from '../helpers/validators.js'
import {
  isTypeOptions,
  isTypeDate,
  isTypeMultipleOptions,
  isTypeArray,
  isTypeDocument,
  isTypeListDocument,
  isTypeTag
} from '../helpers/field-methods.js'

const supportedTypes = [
  'text',
  'string',
  'int',
  'array',
  'boolean',
  'cpfcnpj',
  'cep',
  'phone_number',
  'decimal',
  'email',
  'options',
  'date',
  'timestamp',
  'table',
  'multiple_options',
  'document',
  'list_document',
  'tag'
]
const supportedKeys = ['customer_cpfcnpj', 'customer_name', 'customer_phone_number', 'customer_email', 'customer_email_address']

export function hasFieldUnique(fields) {
  return fields.filter((f) => f.unique).length > 0
}

export function hasCustomerFields(fields) {
  return fields.filter((f) => f.data.indexOf('customer') >= 0).length > 0
}

export function validateKey(fields) {
  const keys = fields.filter((f) => f.key)
  return keys.length > 0
}

function formatField(f = {}, namesColumn = {}, namesData = {}) {
  if (f.type) f.type = f.type.toLowerCase()
  f.key = String(f.key) === 'true'
  f.unique = String(f.unique) === 'true'
  f.required = String(f.required) === 'true'
  f.editable = String(f.editable) === 'true' && !f.key
  f.operator_can_view = String(f.operatorCanView) === 'true' || String(f.operator_can_view) === 'true'
  f.landingpage_can_show = String(f.landingpage_can_show) === 'true'
  f.visible = String(f.visible) === 'true'
  f.has_tab = String(f.has_tab) === 'true'
  f.quick_search = String(f.quick_search) === 'true'
  f.is_priority = String(f.is_priority) === 'true'

  f.label = f.label ? String(f.label) : String(f.column)
  f.column = clearString(f.column.toLowerCase())

  if (namesColumn[f.column]) {
    const index = Object.keys(namesColumn).length
    f.column = `${f.column}_${index}`
  }
  namesColumn[f.column] = f.column

  if (namesData[f.data] && !supportedKeys.includes(f.data)) {
    const index = Object.keys(namesData).length
    f.data = `${f.data}_${index}`
  }
  namesData[f.data] = f.data

  if (isTypeArray(f) && f.fields) {
    f.fields.map((ff) => {
      const result = formatField(ff, namesColumn, namesData)
      namesColumn = result.namesColumn
      namesData = result.namesData
      return result.field
    })
  } else if (isTypeTag(f) && f.fields) {
    f.fields.map((ff) => {
      const result = formatField(ff, namesColumn, namesData)
      namesColumn = result.namesColumn
      namesData = result.namesData
      return result.field
    })
  } else if (isTypeDocument(f) || isTypeListDocument(f)) {
    f.has_expiration_date = String(f.has_expiration_date) === 'true'
    f.has_issue_date = String(f.has_issue_date) === 'true'
  }

  return { field: f, namesColumn, namesData }
}

function formatFieldsOptions(fields) {
  let namesColumn = {}
  let namesData = {}
  return fields.map((f) => {
    const result = formatField(f, namesColumn, namesData)
    namesColumn = result.namesColumn
    namesData = result.namesData
    return result.field
  })
}

function validateFieldDate(field) {
  if (!Object.keys(field).includes('mask'))
    return {
      error: 'Deve informar a máscara ou padrão de data. Ex.: DD/MM/YYYY'
    }
  else if (String(field.mask).length === 0)
    return {
      error: 'Deve informar uma máscara válida de data. Ex.: DD/MM/YYYY'
    }
  return {}
}

function validateFieldOptionsType(field) {
  if (!Object.keys(field).includes('list_options')) {
    return { error: 'O list_options é obrigatório' }
  } else if (!Array.isArray(field.list_options)) {
    return { error: 'O list_options deve ser um array' }
  } else if (field.list_options.length === 0) {
    return { error: 'O list_options não pode ser um array vazio' }
  } else if (!isArrayElementSameTypes(field.list_options)) {
    return {
      error: 'O list_options não pode ser um array com elementos de vários tipos de dados'
    }
  } else if (
    isArrayOfObjects(field.list_options) &&
    field.list_options.filter((o) => !Object.keys(o).includes('value') || !Object.keys(o).includes('label')).length
  ) {
    return {
      error: 'O list_options deve ser um array com elementos da seguntes estrutura `{ value: "", label: "" }`'
    }
  } else if (isArrayWithEmptyElement(field.list_options)) {
    return { error: 'O list_options não pode ter elemento do array vazio' }
  }

  return {}
}

function validateFieldDocument(field) {
  if (!Object.keys(field).includes('has_expiration_date')) {
    return { error: 'O has_expiration_date é obrigatório' }
  } else if (typeof field.has_expiration_date !== 'boolean') {
    return { error: 'O has_expiration_date deve ser true/false' }
  }

  if (!Object.keys(field).includes('has_issue_date')) {
    return { error: 'O has_issue_date é obrigatório' }
  } else if (typeof field.has_issue_date !== 'boolean') {
    return { error: 'O has_issue_date deve ser true/false' }
  }

  return {}
}

function isTagFieldFilled(field = {}) {
  return isTypeTag(field) && Object.keys(field).includes('fields') && field.fields.length
}

function isTagFieldNotFilled(field = {}) {
  return isTypeTag(field) && Object.keys(field).includes('fields') && field.fields.length === 0
}

function isArrayFieldFilled(field = {}) {
  return isTypeArray(field) && Object.keys(field).includes('fields') && field.fields.length
}

function isArrayFieldNotFilled(field = {}) {
  return isTypeArray(field) && Object.keys(field).includes('fields') && field.fields.length === 0
}

function checkIfFieldIsvalid(field = {}, errorsField = {}) {
  if (!errorsField.column) {
    errorsField = { column: field.column, errors: [] }
  }

  if (Object.keys(field).includes('type')) {
    if (!supportedTypes.includes(field.type)) errorsField.errors.push({ error: 'Type não suportado' })

    if (isArrayFieldFilled(field) || isTagFieldFilled(field)) {
      for (const arrayFieldItem of field.fields) {
        let errorsSubfield = { column: arrayFieldItem.column, errors: [] }
        errorsSubfield = checkIfFieldIsvalid(arrayFieldItem, errorsSubfield)
        if (errorsSubfield.errors.length) errorsField.errors.push(errorsSubfield)
      }
    } else if (isArrayFieldNotFilled(field) || isTagFieldNotFilled(field)) {
      errorsField.errors.push({
        error: 'O campo fields deve ser um array de objetos'
      })
    }

    if (isTypeOptions(field) || isTypeMultipleOptions(field)) {
      const error = validateFieldOptionsType(field)
      if (Object.keys(error).length) errorsField.errors.push(error)
      else {
        if (!isArrayOfObjects(field.list_options))
          field.list_options = field.list_options.map((a) => {
            return { value: String(a), label: String(a) }
          })
      }
    }

    if (isTypeDate(field)) {
      const error = validateFieldDate(field)
      if (Object.keys(error).length) errorsField.errors.push(error)
    }

    if (isTypeDocument(field)) {
      const error = validateFieldDocument(field)
      if (error && Object.keys(error).length) errorsField.errors.push(error)
    }

    if (isTypeListDocument(field)) {
      const error = validateFieldDocument(field)
      if (error && Object.keys(error).length) errorsField.errors.push(error)
    }
  } else {
    errorsField.push({ error: 'O type é obrigatório' })
  }

  if (field.key && !supportedKeys.includes(field.data)) {
    errorsField.errors.push({
      error: 'Este campo não tem um "data" permitido para ser usado como chave',
      supported_data_keys: supportedKeys
    })
  }

  return errorsField
}

export function validateFields(fields) {
  const formattedFields = formatFieldsOptions(fields)
  const errors = []

  for (const field of formattedFields) {
    let errorsField = { column: field.column, errors: [] }
    errorsField = checkIfFieldIsvalid(field, errorsField)
    if (errorsField.errors.length) {
      errors.push(errorsField)
    }
  }

  return { fields: formattedFields, errors }
}
