const fs = require('fs')
const readline = require('readline')
const md5 = require('md5')
const fetch = require('node-fetch')

class Validator {
  async validateAndFormatFromJson (data, fields) {
    var lineInvalids = []
    var lineValids = []

    data.forEach((line, i) => {
      var lineValues = Object.keys(line).map(key => line[key])
      if (this.validate(lineValues, fields)) {
        var lineFormatted = this.format(lineValues, fields)
        lineValids.push(lineFormatted)
      } else {
        lineInvalids.push(line)
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
            if (self.validate(data, fields)) {
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
            if (self.validate(data, fields)) {
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

  validate (data, rules) {
    var valid = true

    // if (data.length !== rules.length) return false

    data.forEach((el, i) => {
      if (rules[i].required && el.length === 0) {
        console.log('REQUIRED', rules[i].column, el)
        valid = false
      } else if (rules[i].key && el.length === 0) {
        console.log('KEY', rules[i].column, el)
        valid = false
      } else if (rules[i].type === 'int' && !Number.isInteger(parseInt(el))) {
        console.log('INTEGER', rules[i].column, el)
        valid = false
      } else if (rules[i].type === 'array') {
        if (!Array.isArray(el) && rules[i].required) {
          console.log('ARRAY', rules[i].column, el)
          valid = false
        } else if (!this.validateArray(rules[i], el) && rules[i].required) {
          valid = false
        }
      }
    })
    return valid
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
    var formatted = {}
    data.forEach((el, i) => {
      var elText = el
      if (rules[i].data === 'customer_cpfcnpj') {
        elText = elText.replace(/\./g, '')
        elText = elText.replace(/-/g, '')
        elText = elText.replace(/\\/g, '')
        elText = elText.replace(/\//g, '')
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
