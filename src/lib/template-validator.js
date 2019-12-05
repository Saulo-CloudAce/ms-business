const { clearString } = require('../helpers/formatters')
const { isArrayElementSameTypes, isArrayOfObjects, isArrayWithEmptyElement } = require('../helpers/validators')

const supportedTypes = ['text', 'string', 'int', 'array', 'boolean', 'cpfcnpj', 'cep', 'phone_number', 'decimal', 'email', 'options']

function validateKey (fields) {
  const keys = fields.filter(f => f.key)
  return keys.length > 0
}

function formatFieldsOptions (fields) {
  return fields.map(f => {
    if (f.type) f.type = f.type.toLowerCase()
    if (!f.key) f.key = false
    if (!f.required) f.required = false
    if (!f.editable) f.editable = false
    if (!f.operatorCanView || !f.operator_can_view) f.operator_can_view = true
    if (!f.visible) f.visible = true

    f.label = (f.label) ? f.label : f.column
    f.column = clearString(f.column.toLowerCase())

    if (f.type === 'array') {
      if (f.fields) {
        f.fields.map(ff => {
          if (!ff.key) ff.key = false
          if (!ff.required) ff.required = false
          if (!ff.editable) ff.editable = false
          if (!ff.operatorCanView || f.operator_can_view) ff.operator_can_view = true
          if (!ff.visible) ff.visible = true

          ff.label = (ff.label) ? ff.label : ff.column
          ff.column = clearString(ff.column.toLowerCase())
        })
      }
    }

    return f
  })
}

function validateFields (fields) {
  const formattedFields = formatFieldsOptions(fields)
  const errors = []

  for (const field of formattedFields) {
    const errorsField = { column: field.column, errors: [] }
    if (Object.keys(field).includes('type')) {
      if (!supportedTypes.includes(field.type)) errorsField.errors.push({ error: 'Type não suportado' })

      if (field.type === 'array' && field.fields) {
        for (const arrayFieldItem of field.fields) {
          if (Object.keys(arrayFieldItem).includes('type')) {
            if (!supportedTypes.includes(arrayFieldItem.type)) errorsField.errors.push({ field: arrayFieldItem.column, error: 'Type não suportado' })
          } else errorsField.errors.push({ field: arrayFieldItem.column, error: 'O type é obrigatório' })
        }
      }

      if (field.type === 'options' && !Object.keys(field).includes('list_options')) {
        errorsField.errors.push({ error: 'O list_options é obrigatório' })
      } else if (field.type === 'options' && !Array.isArray(field.list_options)) {
        errorsField.errors.push({ error: 'O list_options deve ser um array' })
      } else if (field.type === 'options' && field.list_options.length === 0) {
        errorsField.errors.push({ error: 'O list_options não pode ser um array vazio' })
      } else if (field.type === 'options' && !isArrayElementSameTypes(field.list_options)) {
        errorsField.errors.push({ error: 'O list_options não pode ser um array com elementos de vários tipos de dados' })
      } else if (field.type === 'options' && isArrayOfObjects(field.list_options)) {
        errorsField.errors.push({ error: 'O list_options não pode ser um array de objetos (não suportado)' })
      } else if (field.type === 'options' && isArrayWithEmptyElement(field.list_options)) {
        errorsField.errors.push({ error: 'O list_options não pode ter elemento do array vazio' })
      }
    } else {
      errorsField.push({ error: 'O type é obrigatório' })
    }
    if (errorsField.errors.length) errors.push(errorsField)
  }

  return { fields: formattedFields, errors }
}

module.exports = { validateFields, validateKey }
