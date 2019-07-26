const fs = require('fs')
const readline = require('readline')

class Validator {
  async validateAndFormat (filePath, fields) {
    var readStream = fs.createReadStream(filePath)
    var reader = readline.createInterface({
      input: readStream
    })

    const lineCounter = ((i = 0) => () => ++i)()

    const self = this

    const data = await new Promise((resolve, reject) => {
      var lineInvalids = []
      var lineValids = []
      reader
        .on('line', function (line, lineno = lineCounter()) {
          const data = line.split(',')
          if (self.validate(data, fields)) {
            var dataFormatted = self.format(data, fields)
            lineValids.push(dataFormatted)
          } else {
            lineInvalids.push(lineno)
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
    data.forEach((el, i) => {
      if (rules[i].required && el.length === 0) {
        valid = false
      }
    })
    return valid
  }

  format (data, rules) {
    var formatted = {}
    data.forEach((el, i) => {
      formatted[`${rules[i].data}`] = el
    })
    return formatted
  }
}

module.exports = Validator
