const fs = require('fs')
const readline = require('readline')
const md5 = require('md5')
const fetch = require('node-fetch')
const { validCpf, validCnpj } = require('./cpf-cnpj-validator')
const { validateEmail, isArrayObject } = require('../helpers/validators')

class Validator {
  async validateAndFormatFromJson (data, fields) {
    var lineInvalids = []
    var lineValids = []

    data.forEach((line, i) => {
      var lineValues = Object.keys(line).map(key => line[key])
      const { valid, lineErrors } = this.validate(lineValues, fields, i)
      if (valid) {
        var lineFormatted = this.format(lineValues, fields)
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

  async validateAndFormat (filePath, fields, jumpFirstLine = false, dataSeparator = ';') {
    var readStream = fs.createReadStream(filePath)
    var reader = readline.createInterface({
      input: readStream
    })

    var firstLine = 0
    if (jumpFirstLine) firstLine = 1

    const lineCounter = ((i = 0) => () => ++i)()

    const self = this

    const data = await new Promise((resolve, reject) => {
      var lineInvalids = []
      var lineValids = []
      reader
        .on('line', function (line, lineno = lineCounter()) {
          if (lineno > firstLine) {
            const data = line.split(dataSeparator)
            const { valid, lineErrors } = self.validate(data, fields, lineno)
            if (valid) {
              var dataFormatted = self.format(data, fields)
              lineValids.push(dataFormatted)
            } else {
              lineInvalids.push(lineno)
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
    var readStream = await new Promise((resolve, reject) => {
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

    var firstLine = 0
    if (jumpFirstLine) firstLine = 1

    const lineCounter = ((i = 0) => () => ++i)()

    const self = this

    const data = await new Promise((resolve, reject) => {
      var lineInvalids = []
      var lineValids = []
      reader
        .on('line', function (line, lineno = lineCounter()) {
          if (lineno > firstLine) {
            const data = line.split(dataSeparator)
            const { valid, lineErrors } = self.validate(data, fields, lineno)
            if (valid) {
              var dataFormatted = self.format(data, fields)
              lineValids.push(dataFormatted)
            } else {
              lineInvalids.push(lineno)
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

  validate (data, rules, lineNumber) {
    let valid = true
    const lineErrors = { line: lineNumber, errors: [] }

    // if (data.length !== rules.length) return false

    data.forEach((el, i) => {
      if (rules[i].required && el.length === 0) {
        console.log('REQUIRED', rules[i].column, el)
        lineErrors.errors.push({ column: rules[i].column, error: 'O preenchimento é obrigatório' })
        valid = false
      } else if (rules[i].key && el.length === 0) {
        console.log('KEY', rules[i].column, el)
        lineErrors.errors.push({ column: rules[i].column, error: 'O preenchimento do campo chave é obrigatório' })
        valid = false
      } else if (rules[i].type === 'int' && !Number.isInteger(parseInt(el))) {
        console.log('INTEGER', rules[i].column, el)
        lineErrors.errors.push({ column: rules[i].column, error: 'O valor informado não é um inteiro', current_value: el })
        valid = false
      } else if (rules[i].type === 'decimal') {
        console.log('DECIMAL', rules[i].column, el)
        let elText = String(el).replace(' ', '')
        elText = elText.replace('.', '')
        elText = elText.replace(',', '')
        if (isNaN(elText)) {
          lineErrors.errors.push({ column: rules[i].column, error: 'O valor informado não é um número válido', current_value: el })
          valid = false
        }
      } else if (rules[i].type === 'cep') {
        console.log('CEP', rules[i].column, el)
        if (typeof el === 'string') {
          let elText = el.replace(' ', '')
          elText = elText.replace('-', '')
          if (isNaN(elText)) {
            lineErrors.errors.push({ column: rules[i].column, error: 'O valor informado não é um CEP', current_value: el })
            valid = false
          } else if (elText.length !== 8) {
            lineErrors.errors.push({ column: rules[i].column, error: 'O CEP informado é inválido', current_value: el })
            valid = false
          }
        } else {
          lineErrors.errors.push({ column: rules[i].column, error: 'O valor informado não é uma string com número de CEP', current_value: el })
          valid = false
        }
      } else if (rules[i].type === 'boolean') {
        console.log('BOOLEAN', rules[i].column, el)
        if (!(String(el).toLowerCase() === 'true' || String(el).toLowerCase() === 'false')) {
          lineErrors.errors.push({ column: rules[i].column, error: 'Os valores válidos para este campo são "true" ou "false"', current_value: el })
          valid = false
        }
      } else if (rules[i].type === 'email') {
        console.log('EMAIL', rules[i].column, el)
        if (!validateEmail(el)) {
          lineErrors.errors.push({ column: rules[i].column, error: 'O e-mail informado é inválido', current_value: el })
          valid = false
        }
      } else if (rules[i].type === 'phone_number') {
        console.log('PHONE_NUMBER', rules[i].column, el)
        if (typeof el === 'string') {
          let elText = el.replace(' ', '')
          elText = elText.replace('(', '')
          elText = elText.replace(')', '')
          elText = elText.replace('-', '')
          if (isNaN(elText)) {
            lineErrors.errors.push({ column: rules[i].column, error: 'O valor informado não é um número de telefone', current_value: el })
            valid = false
          } else if (!elText.length >= 10) {
            lineErrors.errors.push({ column: rules[i].column, error: 'O telefone informado não tem a quantidade mínima de 10 números', current_value: el })
            valid = false
          }
        } else {
          lineErrors.errors.push({ column: rules[i].column, error: 'O valor informado não é uma string com número de telefone', current_value: el })
          valid = false
        }
      } else if (rules[i].type === 'array') {
        if (!Array.isArray(el) && rules[i].required) {
          console.log('ARRAY', rules[i].column, el)
          lineErrors.errors.push({ column: rules[i].column, error: 'Este campo é um array e é obrigatório, logo precisa ser preenchido', current_value: el })
          valid = false
        } else if (!this.validateArray(rules[i], el) && rules[i].required) {
          lineErrors.errors.push({ column: rules[i].column, error: 'O array de dados fornecido é invalido.', current_value: el })
          valid = false
        } else if (Object.keys(rules[i]).includes('fields') && !isArrayObject(el)) {
          lineErrors.errors.push({ column: rules[i].column, error: 'Este campo aceita somente array de objetos', current_value: el })
          valid = false
        } else if (!Object.keys(rules[i]).includes('fields') && isArrayObject(el)) {
          lineErrors.errors.push({ column: rules[i].column, error: 'Este campo aceita somente array simples', current_value: el })
          valid = false
        }
      } else if (rules[i].data === 'customer_cpfcnpj' || rules[i].type === 'cpfcnpj') {
        var elText = el.replace(/\./g, '')
        elText = elText.replace(/-/g, '')
        elText = elText.replace(/\\/g, '')
        elText = elText.replace(/\//g, '')
        if (elText.length === 11) {
          if (!validCpf(elText)) {
            lineErrors.errors.push({ column: rules[i].column, error: 'O CPF informado é inválido', current_value: elText })
            valid = false
          }
        } else if (elText.length === 14) {
          if (!validCnpj(elText)) {
            lineErrors.errors.push({ column: rules[i].column, error: 'O CNPJ informado é inválido', current_value: elText })
            valid = false
          }
        } else {
          lineErrors.errors.push({ column: rules[i].column, error: 'O valor informado não tem a quantidade de caracteres válidos para um CPF ou CNPJ', current_value: elText })
          valid = false
        }
      }
    })
    return { valid, lineErrors }
  }

  validateArray (rule, line) {
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
    data.forEach((el, i) => {
      let elText = el
      if (rules[i].data === 'customer_cpfcnpj') {
        elText = elText.replace(/\./g, '')
        elText = elText.replace(/-/g, '')
        elText = elText.replace(/\\/g, '')
        elText = elText.replace(/\//g, '')
      } else if (rules[i].type === 'decimal') {
        elText = elText.replace('.', '')
        elText = elText.replace(',', '.')
      } else if (rules[i].type === 'array') {
        var arrData = []
        if (!rules[i].fields) {
          if (Array.isArray(el)) {
            el.forEach((element, x) => {
              var item = {}
              item[rules[i].data] = element
              arrData.push(item)
            })
          }
        } else {
          if (Array.isArray(el)) {
            el.forEach((element, x) => {
              var item = {}
              rules[i].fields.forEach((field, y) => {
                item[field.data] = element[field.column]
              })
              arrData.push(item)
            })
          }
        }
        elText = arrData
      }
      formatted[`${rules[i].data}`] = elText
    })
    formatted['_id'] = md5(new Date() + Math.random())
    return formatted
  }
}

module.exports = Validator
