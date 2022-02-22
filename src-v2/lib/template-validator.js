import { clearString } from '../helpers/formatters.js'
import { isArrayElementSameTypes, isArrayOfObjects, isArrayWithEmptyElement } from '../helpers/validators.js'
import {
  isTypeOptions,
  isTypeDate,
  isTypeMultipleOptions,
  isTypeArray,
  isTypeDocument,
  isTypeListDocument
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
  'list_document'
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

function formatFieldsOptions(fields) {
  return fields.map((f) => {
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

    f.label = f.label ? String(f.label) : String(f.column)
    f.column = clearString(f.column.toLowerCase())

    if (isTypeArray(f)) {
      if (f.fields) {
        f.fields.map((ff) => {
          ff.key = String(ff.key) === 'true'
          if (!ff.required) ff.required = false
          ff.required = String(ff.required) === 'true'
          ff.editable = String(ff.editable) === 'true'
          ff.operator_can_view = String(ff.operatorCanView) === 'true' || String(ff.operator_can_view) === 'true'
          ff.landingpage_can_show = String(ff.landingpage_can_show) === 'true'
          ff.visible = String(ff.visible) === 'true'
          ff.has_tab = String(ff.has_tab) === 'true'
          ff.quick_search = String(ff.quick_search) === 'true'

          ff.label = ff.label ? String(ff.label) : String(ff.column)
          ff.column = clearString(ff.column.toLowerCase())
        })
      }
    } else if (isTypeDocument(f) || isTypeListDocument(f)) {
      f.has_expiration_date = String(f.has_expiration_date) === 'true'
      f.has_issue_date = String(f.has_issue_date) === 'true'
    }

    return f
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

export function validateFields(fields) {
  const formattedFields = formatFieldsOptions(fields)
  const errors = []

  for (const field of formattedFields) {
    const errorsField = { column: field.column, errors: [] }
    if (Object.keys(field).includes('type')) {
      if (!supportedTypes.includes(field.type)) errorsField.errors.push({ error: 'Type não suportado' })

      if (field.type === 'array' && Object.keys(field).includes('fields') && field.fields.length) {
        field.fields.forEach((arrayFieldItem) => {
          if (Object.keys(arrayFieldItem).includes('type')) {
            if (!supportedTypes.includes(arrayFieldItem.type))
              errorsField.errors.push({
                field: arrayFieldItem.column,
                error: 'Type não suportado'
              })
            else if (isTypeOptions(arrayFieldItem) || isTypeMultipleOptions(field)) {
              const error = validateFieldOptionsType(arrayFieldItem)
              if (Object.keys(error).length)
                errorsField.errors.push({
                  field: arrayFieldItem.column,
                  error: error.error
                })
              else {
                if (!isArrayOfObjects(arrayFieldItem.list_options))
                  arrayFieldItem.list_options = arrayFieldItem.list_options.map((a) => {
                    return { value: String(a), label: String(a) }
                  })
              }
            }
          } else
            errorsField.errors.push({
              field: arrayFieldItem.column,
              error: 'O type é obrigatório'
            })
        })
      } else if (field.type === 'array' && Object.keys(field).includes('fields') && field.fields.length === 0) {
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

    if (errorsField.errors.length) errors.push(errorsField)
  }

  return { fields: formattedFields, errors }
}
