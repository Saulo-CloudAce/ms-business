const moment = require('moment')

function isTypeOptions(field) {
  return field.type === 'options'
}

function isTypeMultipleOptions(field) {
  return field.type === 'multiple_options'
}

function isTypeInt(field) {
  return field.type === 'int'
}

function isTypeDate(field) {
  return field.type === 'date'
}

function isTypeDocument(field) {
  return field.type === 'document'
}

function isTypeListDocument(field) {
  return field.type === 'list_document'
}

function isTypeDecimal(field) {
  return field.type === 'decimal'
}

function isTypeCep(field) {
  return field.type === 'cep'
}

function isTypeBoolean(field) {
  return field.type === 'boolean'
}

function isTypeEmail(field) {
  return field.type === 'email'
}

function isTypePhoneNumber(field) {
  return field.type === 'phone_number' || field.data === 'customer_phone_number'
}

function isTypeArray(field) {
  return field.type === 'array'
}

function isTypeCpfCnpj(field) {
  return field.data === 'customer_cpfcnpj' || field.type === 'cpfcnpj'
}

function isTypeString(field) {
  return field.type === 'string'
}

function isRequired(field) {
  return field.required
}

function isKey(field) {
  return field.key
}

function isUnique(field) {
  return field.unique
}

function isValidDate(date, mask) {
  date = String(date).trim()
  mask = String(mask).trim()

  return moment(date, mask, true).isValid()
}

module.exports = {
  isTypeOptions,
  isTypeInt,
  isTypeDecimal,
  isTypeBoolean,
  isTypeCep,
  isTypeEmail,
  isTypePhoneNumber,
  isTypeArray,
  isTypeCpfCnpj,
  isRequired,
  isKey,
  isTypeDate,
  isTypeDocument,
  isTypeListDocument,
  isUnique,
  isTypeMultipleOptions,
  isValidDate,
  isTypeString
}
