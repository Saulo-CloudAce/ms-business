const fs = require('fs')
const readline = require('readline')
const md5 = require('md5')
const fetch = require('node-fetch')
const moment = require('moment')
const { validCpf, validCnpj } = require('./cpf-cnpj-validator')
const { validateEmail, isArrayObject, arraysEqual, arraysDiff, listElementDuplicated } = require('../helpers/validators')
const {
  isKey,
  isTypeDate,
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
  isUnique } = require('../helpers/field-methods')

class Validator {
  _mapLineDataToLineDataWithRules (line, rulesByColumn) {
    const lineWithRulesFields = {}
    Object.keys(line).forEach(key => {
      lineWithRulesFields[key] = { value: line[key], rules: rulesByColumn[key] }
    })
    return lineWithRulesFields
  }

  _indexTemplateFieldsByColumn (templateFields) {
    const rulesByColumn = {}
    templateFields.forEach(field => {
      rulesByColumn[field.column] = field
    })
    return rulesByColumn
  }

  async validateAndFormatFromJson (data, fields, listBatches = []) {
    const lineInvalids = []
    const lineValids = []
    const lineValidsCustomer = []
    const rulesByColumn = this._indexTemplateFieldsByColumn(fields)

    data.forEach((line, i) => {
      const lineWithRulesFields = this._mapLineDataToLineDataWithRules(line, rulesByColumn)

      const { valid, lineErrors } = this.validate(lineWithRulesFields, i, listBatches, fields)
      if (valid) {
        const lineFormatted = this.format(line, rulesByColumn)
        lineValids.push(lineFormatted)
        lineValidsCustomer.push(this.formatCustomer(line, rulesByColumn))
      } else {
        lineInvalids.push(lineErrors)
      }
    })

    return {
      invalids: lineInvalids,
      valids: lineValids,
      validsCustomer: lineValidsCustomer
    }
  }

  _getColumnsRequiredName (templateFields) {
    const listColumnsName = []
    templateFields.forEach(field => {
      if (field.type === 'array' && Object.keys(field).includes('fields')) {
        field.fields.forEach(subField => listColumnsName.push(subField.column))
      } else {
        listColumnsName.push(field.column)
      }
    })

    return listColumnsName
  }

  _convertFileDataToJSONData (fileData, fileColumnsName, templateFields) {
    const jsonData = {}
    const mapColumnsFile = []
    fileColumnsName.forEach((c, index) => { mapColumnsFile[c.trim()] = index })
    templateFields.forEach(tf => {
      if (tf.type === 'array' && Object.keys(tf).includes('fields')) {
        const listSubFieldData = {}
        tf.fields.forEach(subField => {
          const jsonDataSubField = subField.column
          const fileDataIndex = mapColumnsFile[subField.column]
          listSubFieldData[jsonDataSubField] = fileData[fileDataIndex]
        })
        const jsonDataField = tf.column
        jsonData[jsonDataField] = [listSubFieldData]
      } else {
        const jsonDataField = tf.column
        const fileDataIndex = mapColumnsFile[tf.column]
        jsonData[jsonDataField] = fileData[fileDataIndex]
      }
    })

    return jsonData
  }

  async validateAndFormat (filePath, fields, jumpFirstLine = false, dataSeparator = ';', listBatches = []) {
    const rulesByColumn = this._indexTemplateFieldsByColumn(fields)
    const readStream = fs.createReadStream(filePath)
    const reader = readline.createInterface({
      input: readStream
    })

    const firstLine = 1

    const lineCounter = ((i = 0) => () => ++i)()

    const self = this

    const data = await new Promise((resolve, reject) => {
      const lineInvalids = []
      const lineValids = []
      const lineValidsCustomer = []
      let fileColumnsName = []
      reader
        .on('line', function (line, lineno = lineCounter()) {
          if (String(line).length) {
            if (lineno === firstLine) {
              fileColumnsName = line.split(dataSeparator)
              const columnsName = self._getColumnsRequiredName(fields)
              if (columnsName.length < fileColumnsName.length) {
                const columnsDiff = arraysDiff(fileColumnsName, columnsName)
                const columnsDuplicated = listElementDuplicated(fileColumnsName)
                lineInvalids.push({ error: 'O arquivo tem mais colunas do que as definidas no template', columns_diff: columnsDiff, columns_duplicated: columnsDuplicated })
                resolve({ invalids: lineInvalids, valids: lineValids })
                reader.close()
                reader.removeAllListeners()
              } else if (!arraysEqual(columnsName, fileColumnsName)) {
                const columnsDiff = arraysDiff(columnsName, fileColumnsName)
                lineInvalids.push({ error: 'O arquivo não tem todos os campos do template', columns_template: columnsName, columns_file: fileColumnsName, columns_diff: columnsDiff })
                resolve({ invalids: lineInvalids, valids: lineValids })
                reader.close()
                reader.removeAllListeners()
              }
            } else {
              const data = line.split(dataSeparator)
              const jsonData = self._convertFileDataToJSONData(data, fileColumnsName, fields)
              const lineWithRulesFields = self._mapLineDataToLineDataWithRules(jsonData, rulesByColumn)
              const lineNumberAtFile = lineno - 1
              const { valid, lineErrors } = self.validate(lineWithRulesFields, lineNumberAtFile, listBatches, fields)

              if (valid) {
                const dataFormatted = self.format(jsonData, rulesByColumn)
                lineValids.push(dataFormatted)
                lineValidsCustomer.push(self.formatCustomer(jsonData, rulesByColumn))
              } else {
                lineInvalids.push(lineErrors)
              }
            }
          }
        })
        .on('close', function () {
          return resolve({ invalids: lineInvalids, valids: lineValids, validsCustomer: lineValidsCustomer })
        })
        .on('error', function (err) {
          console.error('READ_FILE_UPLOAD', err)
          throw new Error(err)
        })
    })

    let { invalids, valids, validsCustomer } = data

    valids = this._joinDataBatch(valids, fields)

    return {
      invalids,
      valids,
      validsCustomer
    }
  }

  _mergeData (listLineData, columnsArray) {
    const firstLineData = listLineData.shift()
    listLineData.forEach(line => {
      columnsArray.forEach(col => {
        const lineFilled = line[col.data].filter(l => Object.keys(l).filter(lk => String(l[lk]).length > 0).length > 0)
        if (lineFilled.length) firstLineData[col.data] = firstLineData[col.data].concat(lineFilled)
      })
    })

    return firstLineData
  }

  _joinDataBatch (dataBatch, rules) {
    const fieldKey = rules.filter(r => r.key)
    const columnKey = (fieldKey.length && Object.keys(fieldKey[0]).includes('data')) ? fieldKey[0].data : rules.find(r => r.unique).data
    const columnsArray = rules.filter(r => isTypeArray(r))
    let dataIndexedByKeyColumn = {}
    dataBatch.forEach(data => {
      const dataKeyValue = data[columnKey]
      if (Object.keys(dataIndexedByKeyColumn).includes(dataKeyValue)) dataIndexedByKeyColumn[dataKeyValue].push(data)
      else {
        dataIndexedByKeyColumn[dataKeyValue] = [data]
      }
    })
    dataIndexedByKeyColumn = Object.keys(dataIndexedByKeyColumn).map(k => {
      if (dataIndexedByKeyColumn[k].length > 1) return this._mergeData(dataIndexedByKeyColumn[k], columnsArray)
      return dataIndexedByKeyColumn[k][0]
    })
    return dataIndexedByKeyColumn
  }

  async validateAndFormatFromUrlFile (filePath, fields, jumpFirstLine = false, dataSeparator = ';', listBatches = []) {
    const rulesByColumn = this._indexTemplateFieldsByColumn(fields)
    const readStream = await new Promise((resolve, reject) => {
      fetch(filePath)
        .then(res => {
          const dest = fs.createWriteStream('/tmp/teste')
          res.body.pipe(dest)
          resolve(fs.createReadStream('/tmp/teste'))
        })
    })
    const reader = readline.createInterface({
      input: readStream
    })

    const firstLine = 1

    const lineCounter = ((i = 0) => () => ++i)()

    const self = this

    const data = await new Promise((resolve, reject) => {
      const lineInvalids = []
      const lineValids = []
      const lineValidsCustomer = []
      let fileColumnsName = []
      reader
        .on('line', function (line, lineno = lineCounter()) {
          if (String(line).length) {
            if (lineno === firstLine) {
              fileColumnsName = line.split(dataSeparator)
              const columnsName = self._getColumnsRequiredName(fields)
              if (columnsName.length < fileColumnsName.length) {
                const columnsDiff = arraysDiff(columnsName, fileColumnsName)
                const columnsDuplicated = listElementDuplicated(fileColumnsName)
                lineInvalids.push({ error: 'O arquivo tem mais colunas do que as definidas no template', columns_diff: columnsDiff, columns_duplicated: columnsDuplicated })
                resolve({ invalids: lineInvalids, valids: lineValids })
                reader.close()
                reader.removeAllListeners()
              } else if (!arraysEqual(columnsName, fileColumnsName)) {
                const columnsDiff = arraysDiff(columnsName, fileColumnsName)
                lineInvalids.push({ error: 'O arquivo não tem todos os campos do template', columns_template: columnsName, columns_file: fileColumnsName, columns_diff: columnsDiff })
                resolve({ invalids: lineInvalids, valids: lineValids })
                reader.close()
                reader.removeAllListeners()
              }
            } else {
              const data = line.split(dataSeparator)
              const jsonData = self._convertFileDataToJSONData(data, fileColumnsName, fields)
              const lineWithRulesFields = self._mapLineDataToLineDataWithRules(jsonData, rulesByColumn)
              const lineNumberAtFile = lineno - 1
              const { valid, lineErrors } = self.validate(lineWithRulesFields, lineNumberAtFile, listBatches, fields)

              if (valid) {
                const dataFormatted = self.format(jsonData, rulesByColumn)
                lineValids.push(dataFormatted)
                lineValidsCustomer.push(self.formatCustomer(jsonData, rulesByColumn))
              } else {
                lineInvalids.push(lineErrors)
              }
            }
          }
        })
        .on('close', function () {
          return resolve({ invalids: lineInvalids, valids: lineValids, validsCustomer: lineValidsCustomer })
        })
        .on('error', function (err) {
          console.error('READ_FILE_URL', err)
          throw new Error(err)
        })
    })

    const { invalids, valids, validsCustomer } = data

    return {
      invalids,
      valids,
      validsCustomer
    }
  }

  _isRequiredOrFill (rules, fieldData) {
    return isRequired(rules) || String(fieldData).length > 0
  }

  _validateFieldRequired (rules, fieldData, errors) {
    if (String(fieldData).length === 0) errors.push({ column: rules.column, error: 'O preenchimento é obrigatório' })
    return errors
  }

  _validateFieldKey (rules, fieldData, errors) {
    if (String(fieldData).length === 0) errors.push({ column: rules.column, error: 'O preenchimento do campo chave é obrigatório' })
    return errors
  }

  _validateFieldUnique (rules, fieldData, errors, listBatches = []) {
    if (String(fieldData).length === 0) errors.push({ column: rules.column, error: 'O preenchimento do campo único é obrigatório' })
    else {
      let dataDuplicated = false
      for (const batch of listBatches) {
        const dataExist = batch.data.filter(d => String(d[rules.column]).toLowerCase().trim() === String(fieldData).toLowerCase().trim())
        if (dataExist.length) {
          dataDuplicated = true
          break
        }
      }
      if (dataDuplicated) errors.push({ column: rules.column, error: 'Já existe um lote com este registro' })
    }

    return errors
  }

  _validateFieldInt (rules, fieldData, errors) {
    if (!Number.isInteger(parseInt(fieldData))) errors.push({ column: rules.column, error: 'O valor informado não é um inteiro', current_value: fieldData })
    return errors
  }

  _validateFieldDate (rules, fieldData, errors) {
    const date = fieldData.trim()
    if (!moment(date, rules.mask).isValid()) errors.push({ column: rules.column, error: 'O valor informado não é uma data válida', current_value: date })
    return errors
  }

  _validateFieldOptions (rules, fieldData, errors) {
    if (rules.list_options.filter(o => String(o.value) === String(fieldData)).length === 0) {
      errors.push({ column: rules.column, error: 'O valor informado não está entre os pré-definidos na lista de opções', current_value: fieldData, list_options: rules.list_options })
    }

    return errors
  }

  _validateFieldDecimal (rules, fieldData, errors) {
    let elText = String(fieldData).replace(' ', '')
    elText = elText.replace('.', '')
    elText = elText.replace(',', '')
    if (isNaN(elText)) errors.push({ column: rules.column, error: 'O valor informado não é um número válido', current_value: fieldData })

    return errors
  }

  _validateFieldCep (rules, fieldData, errors) {
    if (typeof fieldData === 'string') {
      let elText = fieldData.replace(' ', '')
      elText = elText.replace('-', '')
      if (isNaN(elText)) {
        errors.push({ column: rules.column, error: 'O valor informado não é um CEP', current_value: fieldData })
      } else if (elText.length !== 8) {
        errors.push({ column: rules.column, error: 'O CEP informado é inválido', current_value: fieldData })
      }
    } else {
      errors.push({ column: rules.column, error: 'O valor informado não é uma string com número de CEP', current_value: fieldData })
    }

    return errors
  }

  _validateFieldBoolean (rules, fieldData, errors) {
    if (!(String(fieldData).toLowerCase() === 'true' || String(fieldData).toLowerCase() === 'false')) {
      errors.push({ column: rules.column, error: 'Os valores válidos para este campo são "true" ou "false"', current_value: fieldData })
    }

    return errors
  }

  _validateFieldEmail (rules, fieldData, errors) {
    if (!validateEmail(fieldData)) errors.push({ column: rules.column, error: 'O e-mail informado é inválido', current_value: fieldData })
    return errors
  }

  _validateFieldPhoneNumber (rules, fieldData, errors) {
    if (typeof fieldData === 'string') {
      let elText = fieldData.replace(' ', '')
      elText = elText.replace('(', '')
      elText = elText.replace(')', '')
      elText = elText.replace('-', '')
      if (isNaN(elText)) {
        errors.push({ column: rules.column, error: 'O valor informado não é um número de telefone', current_value: fieldData })
      } else if (!elText.length >= 10) {
        errors.push({ column: rules.column, error: 'O telefone informado não tem a quantidade mínima de 10 números', current_value: fieldData })
      }
    } else {
      errors.push({ column: rules.column, error: 'O valor informado não é uma string com número de telefone', current_value: fieldData })
    }

    return errors
  }

  _validateFieldArray (rules, fieldData, errors) {
    if (!Array.isArray(fieldData) && rules.required) {
      errors.push({ column: rules.column, error: 'Este campo é um array e é obrigatório, logo precisa ser preenchido', current_value: fieldData })
    } else if (!this.validateArray(rules, fieldData) && rules.required) {
      errors.push({ column: rules.column, error: 'O array de dados fornecido é invalido.', current_value: fieldData })
    } else if (Object.keys(rules).includes('fields') && !isArrayObject(fieldData)) {
      errors.push({ column: rules.column, error: 'Este campo aceita somente array de objetos', current_value: fieldData })
    } else if (!Object.keys(rules).includes('fields') && isArrayObject(fieldData)) {
      errors.push({ column: rules.column, error: 'Este campo aceita somente array simples', current_value: fieldData })
    }

    return errors
  }

  _validateFieldCpfCnpj (rules, fieldData, errors) {
    let elText = String(fieldData).replace(/\./g, '')
    elText = elText.replace(/-/g, '')
    elText = elText.replace(/\\/g, '')
    elText = elText.replace(/\//g, '')
    elText = elText.trim()

    if (elText.length === 11) {
      if (!validCpf(elText)) {
        errors.push({ column: rules.column, error: 'O CPF informado é inválido', current_value: fieldData })
      }
    } else if (elText.length === 14) {
      if (!validCnpj(elText)) {
        errors.push({ column: rules.column, error: 'O CNPJ informado é inválido', current_value: fieldData })
      }
    } else {
      errors.push({ column: rules.column, error: 'O valor informado não tem a quantidade de caracteres válidos para um CPF ou CNPJ', current_value: fieldData })
    }

    return errors
  }

  validate (data, lineNumber, listBatches = [], fields = []) {
    const lineNumberOnFile = lineNumber + 1
    const lineErrors = { line: lineNumberOnFile, errors: [] }

    const fieldsWithoutRules = Object.keys(data).filter(k => typeof data[k].rules !== 'object')

    if (fieldsWithoutRules.length) {
      const listFieldsRequired = fields.filter(f => fieldsWithoutRules.includes(f.data)).map(f => f.column)
      lineErrors.errors.push({ error: 'Tem campos diferentes do que os definidos no template', fields_list_unkown: listFieldsRequired })
      return { valid: false, lineErrors }
    }

    Object.keys(data).forEach(k => {
      const el = data[k].value
      const rules = data[k].rules

      if (isRequired(rules)) {
        lineErrors.errors = this._validateFieldRequired(rules, el, lineErrors.errors)
      }
      if (isKey(rules) && this._isRequiredOrFill(rules, el)) {
        lineErrors.errors = this._validateFieldKey(rules, el, lineErrors.errors)
      }
      if (isUnique(rules) && this._isRequiredOrFill(rules, el)) {
        lineErrors.errors = this._validateFieldUnique(rules, el, lineErrors.errors, listBatches)
      }
      if (isTypeDate(rules) && this._isRequiredOrFill(rules, el)) {
        lineErrors.errors = this._validateFieldDate(rules, el, lineErrors.errors)
      }
      if (isTypeInt(rules) && this._isRequiredOrFill(rules, el)) {
        lineErrors.errors = this._validateFieldInt(rules, el, lineErrors.errors)
      }
      if (isTypeOptions(rules) && this._isRequiredOrFill(rules, el)) {
        lineErrors.errors = this._validateFieldOptions(rules, el, lineErrors.errors)
      }
      if (isTypeDecimal(rules) && this._isRequiredOrFill(rules, el)) {
        lineErrors.errors = this._validateFieldDecimal(rules, el, lineErrors.errors)
      }
      if (isTypeCep(rules) && this._isRequiredOrFill(rules, el)) {
        lineErrors.errors = this._validateFieldCep(rules, el, lineErrors.errors)
      }
      if (isTypeBoolean(rules) && this._isRequiredOrFill(rules, el)) {
        lineErrors.errors = this._validateFieldBoolean(rules, el, lineErrors.errors)
      }
      if (isTypeEmail(rules) && this._isRequiredOrFill(rules, el)) {
        lineErrors.errors = this._validateFieldEmail(rules, el, lineErrors.errors)
      }
      if (isTypePhoneNumber(rules) && this._isRequiredOrFill(rules, el)) {
        lineErrors.errors = this._validateFieldPhoneNumber(rules, el, lineErrors.errors)
      }
      if (isTypeArray(rules) && this._isRequiredOrFill(rules, el)) {
        lineErrors.errors = this._validateFieldArray(rules, el, lineErrors.errors)
      }
      if (isTypeCpfCnpj(rules) && this._isRequiredOrFill(rules, el)) {
        lineErrors.errors = this._validateFieldCpfCnpj(rules, el, lineErrors.errors)
      }
    })
    return { valid: (lineErrors.errors.length === 0), lineErrors }
  }

  validateArray (rules, el) {
    const valid = true
    return valid
  }

  _formatFieldCpfCnpj (fieldData) {
    let elText = fieldData.replace(/\./g, '')
    elText = elText.replace(/-/g, '')
    elText = elText.replace(/\\/g, '')
    elText = elText.replace(/\//g, '')

    return elText
  }

  _formatFieldPhoneNumber (fieldData) {
    let elText = fieldData.replace(/-/g, '')
    elText = elText.replace('(', '')
    elText = elText.replace(')', '')
    elText = elText.replace(' ', '')

    if (elText.length <= 8) return ""

    return elText
  }

  _formatFieldCep (fieldData) {
    return fieldData.replace(/-/g, '')
  }

  _formatFieldDecimal (fieldData) {
    let elText = fieldData
    if (String(elText).indexOf(',') >= 0) {
      elText = fieldData.replace('.', '')
      elText = elText.replace(',', '.')
    }

    return elText
  }

  _formatFieldArray (fieldRules, fieldData) {
    const arrData = []
    if (!Object.keys(fieldRules).includes('fields')) {
      if (Array.isArray(fieldData)) {
        fieldData.forEach((element, x) => {
          if (String(element).length) {
            const item = {}
            item[fieldRules.data] = element
            arrData.push(item)
          }
        })
      }
    } else {
      if (Array.isArray(fieldData)) {
        fieldData.filter(fd => Object.keys(fd).filter(fdk => String(fd[fdk]).length > 0).length > 0)
          .forEach(element => {
            const item = {}
            fieldRules.fields.forEach(field => {
              item[field.data] = element[field.column]
            })
            arrData.push(item)
          })
      }
    }

    return arrData
  }

  format (data, rules) {
    const formatted = {}
    Object.keys(data).forEach(fieldKey => {
      const el = data[fieldKey]
      const fieldRules = rules[fieldKey]

      let elText = el
      if (isTypeCpfCnpj(fieldRules)) {
        elText = this._formatFieldCpfCnpj(elText)
      } else if (isTypePhoneNumber(fieldRules)) {
        elText = this._formatFieldPhoneNumber(elText)
      } else if (isTypeCep(fieldRules)) {
        elText = this._formatFieldCep(elText)
      } else if (isTypeDecimal(fieldRules)) {
        elText = this._formatFieldDecimal(elText)
      } else if (isTypeArray(fieldRules)) {
        elText = this._formatFieldArray(fieldRules, elText)
      }
      formatted[fieldRules.column] = elText
    })
    formatted['_id'] = md5(new Date() + Math.random())
    return formatted
  }

  formatCustomer (data, rules) {
    const formatted = {}
    Object.keys(data).forEach(fieldKey => {
      const el = data[fieldKey]
      const fieldRules = rules[fieldKey]

      let elText = el
      if (isTypeCpfCnpj(fieldRules)) {
        elText = this._formatFieldCpfCnpj(elText)
      } else if (isTypePhoneNumber(fieldRules)) {
        elText = this._formatFieldPhoneNumber(elText)
      } else if (isTypeCep(fieldRules)) {
        elText = this._formatFieldCep(elText)
      } else if (isTypeDecimal(fieldRules)) {
        elText = this._formatFieldDecimal(elText)
      } else if (isTypeArray(fieldRules)) {
        elText = this._formatFieldArray(fieldRules, elText)
      }

      formatted[fieldRules.data] = elText

      if (fieldRules.data === 'customer_phone_number') {
        if (Object.keys(formatted).includes('customer_phone_number')) {
          if (Object.keys(formatted).includes('customer_phone')) {
            formatted['customer_phone'] = [...formatted['customer_phone']]
            formatted['customer_phone'].push({ customer_phone_number: elText })
            delete formatted.customer_phone_number
          } else {
            formatted['customer_phone'] = [{ customer_phone_number: elText }]
            delete formatted.customer_phone_number
          }
        } else if (Object.keys(formatted).includes('customer_phone')) {
          formatted['customer_phone'].push({ customer_phone_number: elText })
        }
      }
    })

    formatted['_id'] = md5(new Date() + Math.random())
    return formatted
  }
}

module.exports = Validator
