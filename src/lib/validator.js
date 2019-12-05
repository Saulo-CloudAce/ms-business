const fs = require('fs')
const readline = require('readline')
const md5 = require('md5')
const fetch = require('node-fetch')
const { validCpf, validCnpj } = require('./cpf-cnpj-validator')
const { validateEmail, isArrayObject, arraysEqual, arraysDiff, listElementDuplicated } = require('../helpers/validators')

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

  async validateAndFormatFromJson (data, fields) {
    const lineInvalids = []
    const lineValids = []
    const rulesByColumn = this._indexTemplateFieldsByColumn(fields)

    data.forEach((line, i) => {
      const lineWithRulesFields = this._mapLineDataToLineDataWithRules(line, rulesByColumn)

      const { valid, lineErrors } = this.validate(lineWithRulesFields, i)
      if (valid) {
        const lineFormatted = this.format(line, rulesByColumn)
        lineValids.push(lineFormatted)
      } else {
        lineInvalids.push(lineErrors)
      }
    })

    return {
      invalids: lineInvalids,
      valids: lineValids
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

  async validateAndFormat (filePath, fields, jumpFirstLine = false, dataSeparator = ';') {
    const rulesByColumn = this._indexTemplateFieldsByColumn(fields)
    const readStream = fs.createReadStream(filePath)
    const reader = readline.createInterface({
      input: readStream
    })

    const firstLine = 1
    // if (jumpFirstLine) firstLine = 1

    const lineCounter = ((i = 0) => () => ++i)()

    const self = this

    const data = await new Promise((resolve, reject) => {
      const lineInvalids = []
      const lineValids = []
      let fileColumnsName = []
      reader
        .on('line', function (line, lineno = lineCounter()) {
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
            const { valid, lineErrors } = self.validate(lineWithRulesFields, lineNumberAtFile)

            if (valid) {
              var dataFormatted = self.format(jsonData, rulesByColumn)
              lineValids.push(dataFormatted)
            } else {
              lineInvalids.push(lineErrors)
            }
          }
        })
        .on('close', function () {
          return resolve({ invalids: lineInvalids, valids: lineValids })
        })
    })

    const { invalids, valids } = data

    return {
      invalids,
      valids
    }
  }

  async validateAndFormatFromUrlFile (filePath, fields, jumpFirstLine = false, dataSeparator = ';') {
    const rulesByColumn = this._indexTemplateFieldsByColumn(fields)
    const readStream = await new Promise((resolve, reject) => {
      fetch(filePath)
        .then(res => {
          const dest = fs.createWriteStream('/tmp/teste')
          res.body.pipe(dest)
          resolve(fs.createReadStream('/tmp/teste'))
        })
    })
    var reader = readline.createInterface({
      input: readStream
    })

    const firstLine = 1
    // if (jumpFirstLine) firstLine = 1

    const lineCounter = ((i = 0) => () => ++i)()

    const self = this

    const data = await new Promise((resolve, reject) => {
      const lineInvalids = []
      const lineValids = []
      let fileColumnsName = []
      reader
        .on('line', function (line, lineno = lineCounter()) {
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
            const { valid, lineErrors } = self.validate(lineWithRulesFields, lineNumberAtFile)

            if (valid) {
              var dataFormatted = self.format(jsonData, rulesByColumn)
              lineValids.push(dataFormatted)
            } else {
              lineInvalids.push(lineErrors)
            }
          }
        })
        .on('close', function () {
          return resolve({ invalids: lineInvalids, valids: lineValids })
        })
    })

    const { invalids, valids } = data

    return {
      invalids,
      valids
    }
  }

  validate (data, lineNumber) {
    let valid = true
    const lineErrors = { line: lineNumber, errors: [] }

    const fieldsWithoutRules = Object.keys(data).filter(k => typeof data[k].rules !== 'object')

    if (fieldsWithoutRules.length) {
      lineErrors.errors.push({ error: 'Tem campos diferentes do que os definidos no template', fields_list_unkown: fieldsWithoutRules })
      valid = false
      return { valid, lineErrors }
    }

    Object.keys(data).forEach((k, i) => {
      const el = data[k].value
      const rules = data[k].rules

      if (rules.required && el.length === 0) {
        console.log('REQUIRED', rules.column, el)
        lineErrors.errors.push({ column: rules.column, error: 'O preenchimento é obrigatório' })
        valid = false
      } else if (rules.key && el.length === 0) {
        console.log('KEY', rules.column, el)
        lineErrors.errors.push({ column: rules.column, error: 'O preenchimento do campo chave é obrigatório' })
        valid = false
      } else if (rules.type === 'int' && !Number.isInteger(parseInt(el))) {
        console.log('INTEGER', rules.column, el)
        lineErrors.errors.push({ column: rules.column, error: 'O valor informado não é um inteiro', current_value: el })
        valid = false
      } else if (rules.type === 'options') {
        console.log('OPTIONS', rules.column, el)
        console.log(rules.list_options)
        if (!rules.list_options.map(o => String(o).toLowerCase()).includes(String(el).toLowerCase())) {
          lineErrors.errors.push({ column: rules.column, error: 'O valor informado não está entre os pré-definidos na lista de opções', current_value: el, list_options: rules.list_options })
          valid = false
        }
      } else if (rules.type === 'decimal') {
        console.log('DECIMAL', rules.column, el)
        let elText = String(el).replace(' ', '')
        elText = elText.replace('.', '')
        elText = elText.replace(',', '')
        if (isNaN(elText)) {
          lineErrors.errors.push({ column: rules.column, error: 'O valor informado não é um número válido', current_value: el })
          valid = false
        }
      } else if (rules.type === 'cep') {
        console.log('CEP', rules.column, el)
        if (typeof el === 'string') {
          let elText = el.replace(' ', '')
          elText = elText.replace('-', '')
          if (isNaN(elText)) {
            lineErrors.errors.push({ column: rules.column, error: 'O valor informado não é um CEP', current_value: el })
            valid = false
          } else if (elText.length !== 8) {
            lineErrors.errors.push({ column: rules.column, error: 'O CEP informado é inválido', current_value: el })
            valid = false
          }
        } else {
          lineErrors.errors.push({ column: rules.column, error: 'O valor informado não é uma string com número de CEP', current_value: el })
          valid = false
        }
      } else if (rules.type === 'boolean') {
        console.log('BOOLEAN', rules.column, el)
        if (!(String(el).toLowerCase() === 'true' || String(el).toLowerCase() === 'false')) {
          lineErrors.errors.push({ column: rules.column, error: 'Os valores válidos para este campo são "true" ou "false"', current_value: el })
          valid = false
        }
      } else if (rules.type === 'email') {
        console.log('EMAIL', rules.column, el)
        if (!validateEmail(el)) {
          lineErrors.errors.push({ column: rules.column, error: 'O e-mail informado é inválido', current_value: el })
          valid = false
        }
      } else if (rules.type === 'phone_number') {
        console.log('PHONE_NUMBER', rules.column, el)
        if (typeof el === 'string') {
          let elText = el.replace(' ', '')
          elText = elText.replace('(', '')
          elText = elText.replace(')', '')
          elText = elText.replace('-', '')
          if (isNaN(elText)) {
            lineErrors.errors.push({ column: rules.column, error: 'O valor informado não é um número de telefone', current_value: el })
            valid = false
          } else if (!elText.length >= 10) {
            lineErrors.errors.push({ column: rules.column, error: 'O telefone informado não tem a quantidade mínima de 10 números', current_value: el })
            valid = false
          }
        } else {
          lineErrors.errors.push({ column: rules.column, error: 'O valor informado não é uma string com número de telefone', current_value: el })
          valid = false
        }
      } else if (rules.type === 'array') {
        if (!Array.isArray(el) && rules.required) {
          console.log('ARRAY', rules.column, el)
          lineErrors.errors.push({ column: rules.column, error: 'Este campo é um array e é obrigatório, logo precisa ser preenchido', current_value: el })
          valid = false
        } else if (!this.validateArray(rules, el) && rules.required) {
          lineErrors.errors.push({ column: rules.column, error: 'O array de dados fornecido é invalido.', current_value: el })
          valid = false
        } else if (Object.keys(rules).includes('fields') && !isArrayObject(el)) {
          lineErrors.errors.push({ column: rules.column, error: 'Este campo aceita somente array de objetos', current_value: el })
          valid = false
        } else if (!Object.keys(rules).includes('fields') && isArrayObject(el)) {
          lineErrors.errors.push({ column: rules.column, error: 'Este campo aceita somente array simples', current_value: el })
          valid = false
        }
      } else if (rules.data === 'customer_cpfcnpj' || rules.type === 'cpfcnpj') {
        let elText = el.replace(/\./g, '')
        elText = elText.replace(/-/g, '')
        elText = elText.replace(/\\/g, '')
        elText = elText.replace(/\//g, '')
        elText = elText.trim()

        if (elText.length === 11) {
          if (!validCpf(elText)) {
            lineErrors.errors.push({ column: rules.column, error: 'O CPF informado é inválido', current_value: elText })
            valid = false
          }
        } else if (elText.length === 14) {
          if (!validCnpj(elText)) {
            lineErrors.errors.push({ column: rules.column, error: 'O CNPJ informado é inválido', current_value: elText })
            valid = false
          }
        } else {
          lineErrors.errors.push({ column: rules.column, error: 'O valor informado não tem a quantidade de caracteres válidos para um CPF ou CNPJ', current_value: elText })
          valid = false
        }
      }
    })
    return { valid, lineErrors }
  }

  validateArray (rules, el) {
    var valid = true
    // if (rule.fields) {
    //   line.forEach((l, i) => {
    //     rule.fields.forEach((field, x) => {

    //     })
    //   })
    // }
    return valid
  }

  format (data, rules) {
    const formatted = {}
    Object.keys(data).forEach((fieldKey, i) => {
      const el = data[fieldKey]
      const fieldRules = rules[fieldKey]

      let elText = el
      if (fieldRules.data === 'customer_cpfcnpj' || fieldRules.type === 'cpfcnpj') {
        elText = elText.replace(/\./g, '')
        elText = elText.replace(/-/g, '')
        elText = elText.replace(/\\/g, '')
        elText = elText.replace(/\//g, '')
      } else if (fieldRules.data === 'customer_phone_number' || fieldRules.type === 'phone_number') {
        elText = elText.replace(/-/g, '')
        elText = elText.replace('(', '')
        elText = elText.replace(')', '')
        elText = elText.replace(' ', '')
      } else if (fieldRules.data === 'cep') {
        elText = elText.replace(/-/g, '')
      } else if (fieldRules.type === 'decimal') {
        elText = elText.replace('.', '')
        elText = elText.replace(',', '.')
      } else if (fieldRules.type === 'array') {
        var arrData = []
        if (!Object.keys(fieldRules).includes('fields')) {
          if (Array.isArray(el)) {
            el.forEach((element, x) => {
              var item = {}
              item[fieldRules.data] = element
              arrData.push(item)
            })
          }
        } else {
          if (Array.isArray(el)) {
            el.forEach(element => {
              var item = {}
              fieldRules.fields.forEach(field => {
                item[field.data] = element[field.column]
              })
              arrData.push(item)
            })
          }
        }
        elText = arrData
      }
      formatted[fieldRules.data] = elText
    })
    formatted['_id'] = md5(new Date() + Math.random())
    return formatted
  }
}

module.exports = Validator
