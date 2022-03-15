import moment from 'moment'

export function isTypeOptions(field) {
  return field.type === 'options'
}

export function isTypeMultipleOptions(field) {
  return field.type === 'multiple_options'
}

export function isTypeInt(field) {
  return field.type === 'int'
}

export function isTypeDate(field) {
  return field.type === 'date'
}

export function isTypeDocument(field) {
  return field.type === 'document'
}

export function isTypeListDocument(field) {
  return field.type === 'list_document'
}

export function isTypeDecimal(field) {
  return field.type === 'decimal'
}

export function isTypeCep(field) {
  return field.type === 'cep'
}

export function isTypeBoolean(field) {
  return field.type === 'boolean'
}

export function isTypeEmail(field) {
  return field.type === 'email'
}

export function isTypePhoneNumber(field) {
  return field.type === 'phone_number' || field.data === 'customer_phone_number'
}

export function isTypeArray(field) {
  return field.type === 'array'
}

export function isTypeTag(field) {
  return field.type === 'tag'
}

export function isTypeCpfCnpj(field) {
  return field.data === 'customer_cpfcnpj' || field.type === 'cpfcnpj'
}

export function isTypeString(field) {
  return field.type === 'string'
}

export function isRequired(field) {
  return field.required
}

export function isKey(field) {
  return field.key
}

export function isUnique(field) {
  return field.unique
}

export function isValidDate(date, mask) {
  date = String(date).trim()
  mask = String(mask).trim()

  return moment(date, mask, true).isValid()
}
