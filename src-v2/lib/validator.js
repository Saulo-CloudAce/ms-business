import fs from 'fs'
import readline from 'linebyline'
import md5 from 'md5'
import moment from 'moment'
import { validateEmail, isArrayObject, arraysEqual, arraysDiff, listElementDuplicated } from '../helpers/validators.js'
import {
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
  isUnique,
  isTypeMultipleOptions,
  isValidDate,
  isTypeDocument,
  isTypeListDocument,
  isTypeResponsible,
  isTypeCepDistance,
  isTypeTime,
  isValidTime
} from '../helpers/field-methods.js'

import StorageService from '../services/storage-service.js'
import { getGeolocationDataFromCEPs } from '../helpers/geolocation-getter.js'
import { ObjectId } from 'mongodb'

const storageService = new StorageService()

export default class Validator {
  _mapLineDataToLineDataWithRules(line, rulesByColumn) {
    const lineWithRulesFields = {}
    Object.keys(line).forEach((key) => {
      lineWithRulesFields[key] = {
        value: line[key],
        rules: rulesByColumn[key]
      }
    })
    return lineWithRulesFields
  }

  _indexTemplateFieldsByColumn(templateFields) {
    const rulesByColumn = {}
    templateFields.forEach((field) => {
      rulesByColumn[field.column] = field
    })
    return rulesByColumn
  }

  async validateAndFormatFromJson(data, fields, listBatches = []) {
    const lineInvalids = []
    const lineValids = []
    const lineValidsCustomer = []
    const validsPostProcess = []
    const rulesByColumn = this._indexTemplateFieldsByColumn(fields)

    const templateHasCepDistance = this._templateHasCepDistanceField(fields)

    for (let i in data) {
      const line = data[i]
      const lineWithRulesFields = this._mapLineDataToLineDataWithRules(line, rulesByColumn)

      const { valid, lineErrors } = this.validate(lineWithRulesFields, i, listBatches, fields)
      if (valid) {
        const lineFormatted = await this.format(line, rulesByColumn)
        lineValids.push(lineFormatted)
        if (templateHasCepDistance) {
          validsPostProcess.push(lineFormatted)
        }
        lineValidsCustomer.push(this.formatCustomer(line, rulesByColumn))
      } else {
        lineInvalids.push(lineErrors)
      }
    }

    return {
      invalids: lineInvalids,
      valids: lineValids,
      validsCustomer: lineValidsCustomer,
      validsPostProcess
    }
  }

  _getColumnsRequiredName(templateFields) {
    const listColumnsName = []
    templateFields.forEach((field) => {
      if (field.type === 'array' && Object.keys(field).includes('fields')) {
        field.fields.forEach((subField) => listColumnsName.push(subField.column))
      } else {
        listColumnsName.push(field.column)
      }
    })

    return listColumnsName
  }

  _convertFileDataToJSONData(fileData, fileColumnsName, templateFields) {
    const jsonData = {}
    const mapColumnsFile = []
    fileColumnsName.forEach((c, index) => {
      mapColumnsFile[c.trim()] = index
    })
    templateFields.forEach((tf) => {
      if (tf.type === 'array') {
        if (Object.keys(tf).includes('fields')) {
          const listSubFieldData = {}
          tf.fields.forEach((subField) => {
            const jsonDataSubField = subField.column
            const fileDataIndex = mapColumnsFile[subField.column]
            listSubFieldData[jsonDataSubField] = fileData[fileDataIndex]
          })
          const jsonDataField = tf.column
          jsonData[jsonDataField] = [listSubFieldData]
        } else {
          const jsonDataField = tf.column
          const fileDataIndex = mapColumnsFile[tf.column]
          jsonData[jsonDataField] = [fileData[fileDataIndex]]
        }
      } else {
        const jsonDataField = tf.column
        const fileDataIndex = mapColumnsFile[tf.column]
        jsonData[jsonDataField] = fileData[fileDataIndex]
      }
    })

    return jsonData
  }

  async validateAndFormat(filePath, fields, jumpFirstLine = false, dataSeparator = ';', listBatches = []) {
    const rulesByColumn = this._indexTemplateFieldsByColumn(fields)
    const reader = readline(filePath)

    const firstLine = 1

    const lineCounter = (
      (i = 0) =>
      () =>
        ++i
    )()

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
              line = line.toLowerCase()
              fileColumnsName = line.split(dataSeparator)
              const columnsName = self._getColumnsRequiredName(fields)
              if (columnsName.length < fileColumnsName.length) {
                const columnsDiff = arraysDiff(fileColumnsName, columnsName)
                const columnsDuplicated = listElementDuplicated(fileColumnsName)
                lineInvalids.push({
                  error: 'O arquivo tem mais colunas do que as definidas no template',
                  columns_diff: columnsDiff,
                  columns_duplicated: columnsDuplicated
                })
                resolve({ invalids: lineInvalids, valids: lineValids })
              } else if (!arraysEqual(columnsName, fileColumnsName)) {
                const columnsDiff = arraysDiff(columnsName, fileColumnsName)
                lineInvalids.push({
                  error: 'O arquivo não tem todos os campos do template',
                  columns_template: columnsName,
                  columns_file: fileColumnsName,
                  columns_diff: columnsDiff
                })
                resolve({ invalids: lineInvalids, valids: lineValids })
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
                const customerFormatted = self.formatCustomer(jsonData, rulesByColumn)
                lineValidsCustomer.push(customerFormatted)
              } else {
                lineInvalids.push(lineErrors)
              }
            }
          }
        })
        .on('close', function () {
          console.log('End Processing File', filePath)
          return resolve({
            invalids: lineInvalids,
            valids: lineValids,
            validsCustomer: lineValidsCustomer
          })
        })
        .on('error', function (err) {
          console.error('Error on read file', filePath, err)
          throw new Error(err)
        })
    })

    let { invalids, valids, validsCustomer } = data

    if (valids.length) {
      valids = this._joinDataBatch(valids, fields)

      validsCustomer = this._joinCustomerBatch(validsCustomer, fields)
    }

    return {
      invalids,
      valids,
      validsCustomer
    }
  }

  _mergeData(listLineData, columnsArray) {
    if (columnsArray.length) {
      const firstLineData = listLineData.shift()
      listLineData.forEach((line) => {
        columnsArray.forEach((col) => {
          const lineFilled = line[col.column].filter(
            (l) =>
              Object.keys(l).filter(
                (lk) =>
                  String(l[lk]).length > 0 &&
                  firstLineData[col.column] &&
                  Array.isArray(firstLineData[col.column]) &&
                  firstLineData[col.column].length > 0 &&
                  firstLineData[col.column][0][lk] !== l[lk]
              ).length > 0
          )
          if (lineFilled.length) firstLineData[col.column] = firstLineData[col.column].concat(lineFilled)
        })
      })

      return firstLineData
    }
    return listLineData
  }

  _joinDataBatch(dataBatch, rules) {
    const fieldKey = rules.filter((r) => r.key)
    const columnKey = fieldKey.length && Object.keys(fieldKey[0]).includes('data') ? fieldKey[0].column : rules.find((r) => r.unique).column
    const columnsArray = rules.filter((r) => isTypeArray(r))
    if (columnsArray.length === 0) {
      return dataBatch
    }
    let dataIndexedByKeyColumn = {}
    dataBatch.forEach((data) => {
      const dataKeyValue = data[columnKey]
      if (dataIndexedByKeyColumn[dataKeyValue]) {
        dataIndexedByKeyColumn[dataKeyValue].push(data)
      } else {
        dataIndexedByKeyColumn[dataKeyValue] = []
        dataIndexedByKeyColumn[dataKeyValue].push(data)
      }
    })
    dataIndexedByKeyColumn = Object.keys(dataIndexedByKeyColumn).map((k) => {
      if (dataIndexedByKeyColumn[k].length > 1) return this._mergeData(dataIndexedByKeyColumn[k], columnsArray)
      return dataIndexedByKeyColumn[k][0]
    })

    return dataIndexedByKeyColumn
  }

  _mergeCustomer(listLineData, columnsArray) {
    if (columnsArray.length) {
      const firstLineData = listLineData.shift()
      listLineData.forEach((line) => {
        columnsArray.forEach((col) => {
          const lineFilled = line[col.data].filter(
            (l) =>
              Object.keys(l).filter(
                (lk) =>
                  String(l[lk]).length > 0 &&
                  firstLineData[col.data] &&
                  Array.isArray(firstLineData[col.data]) &&
                  firstLineData[col.data].length > 0 &&
                  firstLineData[col.data][0][lk] !== l[lk]
              ).length > 0
          )
          if (lineFilled.length) firstLineData[col.data] = firstLineData[col.data].concat(lineFilled)
        })
      })

      return firstLineData
    }
    return listLineData
  }

  _joinCustomerBatch(customerBatch, rules) {
    const fieldKey = rules.filter((r) => r.key)
    const columnKey = fieldKey.length && Object.keys(fieldKey[0]).includes('data') ? fieldKey[0].data : rules.find((r) => r.unique).data
    const columnsArray = rules.filter((r) => isTypeArray(r))
    let dataIndexedByKeyData = {}
    customerBatch.forEach((data) => {
      const dataKeyValue = data[columnKey]
      if (dataIndexedByKeyData[dataKeyValue]) {
        dataIndexedByKeyData[dataKeyValue].push(data)
      } else {
        dataIndexedByKeyData[dataKeyValue] = []
        dataIndexedByKeyData[dataKeyValue].push(data)
      }
    })
    dataIndexedByKeyData = Object.keys(dataIndexedByKeyData).map((k) => {
      if (dataIndexedByKeyData[k].length > 1) return this._mergeCustomer(dataIndexedByKeyData[k], columnsArray)
      return dataIndexedByKeyData[k][0]
    })

    return dataIndexedByKeyData
  }

  async validateAndFormatFromUrlFile(filePath, fields, jumpFirstLine = false, dataSeparator = ';', listBatches = []) {
    const rulesByColumn = this._indexTemplateFieldsByColumn(fields)
    let fileName, dirFile, bucket

    const fileUrlS3 = filePath.replace('http://', '').replace('https://', '')
    const urlPartsPoint = fileUrlS3.split('.')
    if (urlPartsPoint[0] === 's3') {
      // formato antigo de URL
      const filePathParts = fileUrlS3.split('/')
      fileName = filePathParts[filePathParts.length - 1]
      dirFile = filePathParts.slice(2, filePathParts.length - 1).join('/')
      bucket = filePathParts[1]
    } else {
      // formato novo
      bucket = urlPartsPoint[0]
      const filePathParts = fileUrlS3.split('/')
      fileName = filePathParts[filePathParts.length - 1]
      dirFile = filePathParts.slice(1, filePathParts.length - 1).join('/')
    }

    const tmpFilename = `/tmp/${md5(new Date())}.csv`

    console.log('DOWNLOAD_FILE_START')
    await storageService.downloadFile(`${dirFile}/${fileName}`, bucket, tmpFilename)
    console.log('DOWNLOAD_FILE_FINISHED', filePath)

    // const readStream = fs.createReadStream(tmpFilename)
    const reader = readline(tmpFilename)

    const firstLine = 1

    const lineCounter = (
      (i = 0) =>
      () =>
        ++i
    )()

    const self = this

    const lines = []

    const lineInvalids = []
    const lineValids = []
    const lineValidsCustomer = []
    let fileColumnsName = []

    const data = await new Promise((resolve, reject) => {
      console.log('START_PROCESS_FILE', filePath)
      reader
        .on('line', async function (line, lineno = lineCounter()) {
          if (String(line).length) {
            if (lineno === firstLine) {
              line = line.toLowerCase()
              fileColumnsName = line.split(dataSeparator)
              const columnsName = self._getColumnsRequiredName(fields)
              if (columnsName.length < fileColumnsName.length) {
                const columnsDiff = arraysDiff(columnsName, fileColumnsName)
                const columnsDuplicated = listElementDuplicated(fileColumnsName)
                lineInvalids.push({
                  error: 'O arquivo tem mais colunas do que as definidas no template',
                  columns_diff: columnsDiff,
                  columns_duplicated: columnsDuplicated
                })
                resolve({ invalids: lineInvalids, valids: lineValids, validsCustomer: lineValidsCustomer })
                // reader.close()
                // reader.removeAllListeners()
              } else if (!arraysEqual(columnsName, fileColumnsName)) {
                const columnsDiff = arraysDiff(columnsName, fileColumnsName)
                lineInvalids.push({
                  error: 'O arquivo não tem todos os campos do template',
                  columns_template: columnsName,
                  columns_file: fileColumnsName,
                  columns_diff: columnsDiff
                })
                resolve({ invalids: lineInvalids, valids: lineValids, validsCustomer: lineValidsCustomer })
                // reader.close()
                // reader.removeAllListeners()
              }
            } else {
              lines.push({ data: line, lineNumber: lineno - 1 })
            }
          }
        })
        .on('close', function () {
          console.log('READ_FILE_CLOSED', filePath)
          resolve()
        })
        .on('error', function (err) {
          console.error('READ_FILE_URL', err)
          throw new Error(err)
        })
        .on('end', () => {
          console.log('READ_FILE_FINISHED', filePath)
          resolve()
        })
    })

    const invalids = []
    let valids = []
    let validsCustomer = []
    const validsPostProcess = []

    const templateHasCepDistance = self._templateHasCepDistanceField(fields)

    for (let line of lines) {
      const data = line.data.split(dataSeparator)
      const jsonData = self._convertFileDataToJSONData(data, fileColumnsName, fields)
      const lineWithRulesFields = self._mapLineDataToLineDataWithRules(jsonData, rulesByColumn)
      const lineNumberAtFile = line.lineNumber
      const { valid, lineErrors } = self.validate(lineWithRulesFields, lineNumberAtFile, listBatches, fields)
      if (valid) {
        const dataFormatted = await self.format(jsonData, rulesByColumn)
        valids.push(dataFormatted)
        if (templateHasCepDistance) {
          validsPostProcess.push(dataFormatted)
        }
        validsCustomer.push(self.formatCustomer(jsonData, rulesByColumn))
      } else {
        invalids.push(lineErrors)
      }
    }

    if (valids.length) {
      valids = this._joinDataBatch(valids, fields)

      validsCustomer = this._joinCustomerBatch(validsCustomer, fields)
    }

    return {
      invalids,
      valids,
      validsCustomer,
      validsPostProcess
    }
  }

  _templateHasCepDistanceField(fields = []) {
    for (let f of fields) {
      if (isTypeCepDistance(f)) {
        return true
      } else if (f.fields && Array.isArray(f.fields)) {
        return this._templateHasCepDistanceField(f.fields)
      }
    }

    return false
  }

  _isRequiredOrFill(rules, fieldData) {
    const dataClean = encodeURI(String(fieldData)).replace(new RegExp('s/\x00//g'), '').replace('%00', '')
    return isRequired(rules) || dataClean.length > 0
  }

  _validateFieldRequired(rules, fieldData, errors) {
    if (String(fieldData).length === 0)
      errors.push({
        column: rules.column,
        error: 'O preenchimento é obrigatório'
      })
    return errors
  }

  _validateFieldKey(rules, fieldData, errors) {
    if (String(fieldData).length === 0)
      errors.push({
        column: rules.column,
        error: 'O preenchimento do campo chave é obrigatório'
      })
    return errors
  }

  _validateFieldUnique(rules, fieldData, errors, listBatches = []) {
    if (String(fieldData).length === 0)
      errors.push({
        column: rules.column,
        error: 'O preenchimento do campo único é obrigatório'
      })
    else {
      let dataDuplicated = false
      for (const batch of listBatches) {
        const dataExist = batch.data.filter((d) => String(d[rules.column]).toLowerCase().trim() === String(fieldData).toLowerCase().trim())
        if (dataExist.length) {
          dataDuplicated = true
          break
        }
      }
      if (dataDuplicated)
        errors.push({
          column: rules.column,
          error: 'Já existe um lote com este registro'
        })
    }

    return errors
  }

  _validateFieldInt(rules, fieldData, errors) {
    if (!Number.isInteger(parseInt(fieldData)))
      errors.push({
        column: rules.column,
        error: 'O valor informado não é um inteiro',
        current_value: fieldData
      })
    return errors
  }

  _validateFieldDate(rules, fieldData, errors) {
    if (fieldData) {
      const date = fieldData.trim()
      if (!isValidDate(date, rules.mask))
        errors.push({
          column: rules.column,
          error: 'O valor informado não é uma data válida',
          current_value: date
        })
    } else {
      errors.push({
        column: rules.column,
        error: 'O valor informado para data está vazio',
        current_value: fieldData
      })
    }
    return errors
  }

  _validateFieldTime(rules, fieldData, errors) {
    if (fieldData) {
      const time = fieldData.trim()
      if (!isValidTime(time, rules.mask))
        errors.push({
          column: rules.column,
          error: 'O valor informado não é uma hora válida',
          current_value: time
        })
    } else {
      errors.push({
        column: rules.column,
        error: 'O valor informado para hora está vazio',
        current_value: fieldData
      })
    }
    return errors
  }

  _validateFieldMultipleOptions(rules, fieldData, errors) {
    if (!Array.isArray(fieldData)) fieldData = [fieldData]
    const fieldDataValues = {}
    fieldData.forEach((fd) => {
      fieldDataValues[String(fd)] = fd
    })
    if (rules.list_options.filter((o) => fieldDataValues[String(o.value)]).length !== fieldData.length) {
      errors.push({
        column: rules.column,
        error: 'O valor informado não está entre os pré-definidos na lista de opções',
        current_value: fieldData,
        list_options: rules.list_options
      })
    }

    return errors
  }

  _validateFieldOptions(rules, fieldData, errors) {
    if (Array.isArray(fieldData) && fieldData.length > 1) {
      errors.push({
        column: rules.column,
        error: 'É permitido escolher apenas uma opção',
        current_value: fieldData,
        list_options: rules.list_options
      })

      return errors
    }

    if (!Array.isArray(fieldData)) fieldData = [fieldData]

    const fieldDataValues = {}
    fieldData.forEach((fd) => {
      fieldDataValues[String(fd)] = fd
    })
    if (rules.list_options.filter((o) => fieldDataValues[String(o.value)]).length !== fieldData.length) {
      errors.push({
        column: rules.column,
        error: 'O valor informado não está entre os pré-definidos na lista de opções',
        current_value: fieldData,
        list_options: rules.list_options
      })
    }

    return errors
  }

  _validateFieldDecimal(rules, fieldData, errors) {
    let elText = String(fieldData).replace(' ', '')
    elText = elText.replace('.', '')
    elText = elText.replace(',', '')
    if (isNaN(elText))
      errors.push({
        column: rules.column,
        error: 'O valor informado não é um número válido',
        current_value: fieldData
      })

    return errors
  }

  _validateFieldCepDistance(rules, fieldData, errors) {
    if (typeof fieldData === 'string') {
      const ceps = fieldData.split(':')
      for (let cep of ceps) {
        let elText = cep.replace(' ', '')
        elText = elText.replace('-', '')
        if (isNaN(elText)) {
          errors.push({
            column: rules.column,
            error: 'O valor informado não é um CEP',
            current_value: cep
          })
        } else if (elText.length !== 8) {
          errors.push({
            column: rules.column,
            error: 'O CEP informado é inválido',
            current_value: cep
          })
        }
      }
    } else {
      errors.push({
        column: rules.column,
        error: 'O valor informado não é uma string com número de CEP',
        current_value: fieldData
      })
    }

    return errors
  }

  _validateFieldCep(rules, fieldData, errors) {
    if (typeof fieldData === 'string') {
      let elText = fieldData.replace(' ', '')
      elText = elText.replace('-', '')
      if (isNaN(elText)) {
        errors.push({
          column: rules.column,
          error: 'O valor informado não é um CEP',
          current_value: fieldData
        })
      } else if (elText.length !== 8) {
        errors.push({
          column: rules.column,
          error: 'O CEP informado é inválido',
          current_value: fieldData
        })
      }
    } else {
      errors.push({
        column: rules.column,
        error: 'O valor informado não é uma string com número de CEP',
        current_value: fieldData
      })
    }

    return errors
  }

  _validateFieldBoolean(rules, fieldData, errors) {
    if (!(String(fieldData).toLowerCase() === 'true' || String(fieldData).toLowerCase() === 'false')) {
      errors.push({
        column: rules.column,
        error: 'Os valores válidos para este campo são "true" ou "false"',
        current_value: fieldData
      })
    }

    return errors
  }

  _validateFieldResponsible(rules, fieldData, errors) {
    if (isNaN(fieldData)) {
      errors.push({
        column: rules.column,
        error: 'Este campo deve ser um inteiro',
        current_value: fieldData
      })
    }

    return errors
  }

  _validateFieldEmail(rules, fieldData, errors) {
    if (!validateEmail(fieldData))
      errors.push({
        column: rules.column,
        error: 'O e-mail informado é inválido',
        current_value: fieldData
      })
    return errors
  }

  _validateFieldPhoneNumber(rules, fieldData, errors) {
    if (typeof fieldData === 'string') {
      let elText = fieldData.replace(' ', '')
      elText = elText.replace('(', '')
      elText = elText.replace(')', '')
      elText = elText.replace('-', '')
      if (isNaN(elText)) {
        errors.push({
          column: rules.column,
          error: 'O valor informado não é um número de telefone',
          current_value: fieldData
        })
      } else if (!(elText.length >= 10)) {
        errors.push({
          column: rules.column,
          error: 'O telefone informado não tem a quantidade mínima de 10 números',
          current_value: fieldData
        })
      } else if (parseInt(elText) === 0) {
        errors.push({
          column: rules.column,
          error: 'O telefone informado não é válido, tem todos números zerados.',
          current_value: fieldData
        })
      }
    } else {
      errors.push({
        column: rules.column,
        error: 'O valor informado não é uma string com número de telefone',
        current_value: fieldData
      })
    }

    return errors
  }

  _validateFieldArray(rules, fieldData, errors) {
    if (!isTypeArray(rules)) {
      errors = this._validateField(rules, fieldData, { errors })

      return errors
    }

    if (!Array.isArray(fieldData)) {
      errors.push({
        column: rules.column,
        error: 'Este campo, caso seja preenchido, deve conter um array',
        current_value: fieldData
      })
    } else if (!Array.isArray(fieldData) && rules.required) {
      errors.push({
        column: rules.column,
        error: 'Este campo é um array e é obrigatório, logo precisa ser preenchido',
        current_value: fieldData
      })
    } else if (Object.keys(rules).includes('fields') && !isArrayObject(fieldData)) {
      errors.push({
        column: rules.column,
        error: 'Este campo aceita somente array de objetos',
        current_value: fieldData
      })
    } else if (!Object.keys(rules).includes('fields') && fieldData.length > 0 && isArrayObject(fieldData)) {
      errors.push({
        column: rules.column,
        error: 'Este campo aceita somente array simples',
        current_value: fieldData
      })
    }

    // if (Object.keys(rules).includes('fields') && isArrayObject(fieldData)) {
    //   let serrors = []
    //   const rcolumns = rules.fields.map((f) => f.column)
    //   for (let i = 0; i < rules.fields.length; i++) {
    //     const rfield = rules.fields[i]
    //     for (let x = 0; x < fieldData.length; x++) {
    //       const scolumns = Object.keys(fieldData[x])
    //       const diffcolumns = arraysDiff(rcolumns, scolumns)
    //       if (diffcolumns.length > 0) {
    //         serrors.push({
    //           column: rules.column,
    //           error: 'Este array tem campo diferentes dos definidos no template',
    //           fields_diff: diffcolumns
    //         })
    //         return serrors
    //       }
    //       const sfield = fieldData[x][rfield.column]

    //       const errs = this._validateFieldArray(rfield, sfield, [])
    //       serrors.push(...errs)
    //     }
    //   }

    //   errors.push(...serrors)
    // }

    return errors
  }

  _validateFieldCpfCnpj(rules, fieldData, errors) {
    let elText = String(fieldData).replace(/\./g, '')
    elText = elText.replace(/-/g, '')
    elText = elText.replace(/\\/g, '')
    elText = elText.replace(/\//g, '')
    elText = elText.trim()

    // if (elText.length === 11) {
    //   if (!validCpf(elText)) {
    //     errors.push({ column: rules.column, error: 'O CPF informado é inválido', current_value: fieldData })
    //   }
    // } else if (elText.length === 14) {
    //   if (!validCnpj(elText)) {
    //     errors.push({ column: rules.column, error: 'O CNPJ informado é inválido', current_value: fieldData })
    //   }
    // } else {
    //   errors.push({ column: rules.column, error: 'O valor informado não tem a quantidade de caracteres válidos para um CPF ou CNPJ', current_value: fieldData })
    // }
    if (elText.length !== 11 && elText.length !== 14) {
      errors.push({
        column: rules.column,
        error: 'O valor informado não tem a quantidade de caracteres válidos para um CPF ou CNPJ',
        current_value: fieldData
      })
    }

    return errors
  }

  _validateFieldDocument(rules, fieldData, errors) {
    if (typeof fieldData !== 'object') {
      errors.push({
        column: rules.column,
        error: 'O campo deve ser um objeto com os dados do documento'
      })
    } else if (rules.has_expiration_date) {
      if (!Object.keys(fieldData).includes('expiration_date')) {
        errors.push({
          column: rules.column,
          error: 'O expiration_date é obrigatório'
        })
      } else if (!isValidDate(fieldData.expiration_date, 'YYYY-MM-DD')) {
        errors.push({
          column: rules.column,
          error: 'Data do expiration_date é inválida',
          current_value: `${fieldData.expiration_date}`
        })
      }
    } else if (rules.has_issue_date) {
      if (!Object.keys(fieldData).includes('issue_date')) {
        errors.push({
          column: rules.column,
          error: 'O issue_date é obrigatório'
        })
      } else if (!isValidDate(fieldData.issue_date, 'YYYY-MM-DD')) {
        errors.push({
          column: rules.column,
          error: 'Data do issue_date é inválida',
          current_value: `${fieldData.issue_date}`
        })
      }
    } else if (!rules.has_expiration_date && !rules.has_issue_date && !Object.keys(fieldData).includes('url', 'name', 'type')) {
      errors.push({
        column: rules.column,
        error: 'O url, name e type são obrigatórios'
      })
    }

    return errors
  }

  _validateFieldListDocument(rules, fieldData, errors) {
    if (!Array.isArray(fieldData)) {
      errors.push({
        column: rules.column,
        error: 'O campo deve ser um array de objetos com os dados do documento'
      })

      return errors
    }
    for (let i in fieldData) {
      const document = fieldData[i]
      this._validateFieldDocument(rules, document, errors)
    }

    return errors
  }

  validate(data, lineNumber, listBatches = [], fields = []) {
    const lineNumberOnFile = lineNumber + 1
    const lineErrors = { line: lineNumberOnFile, errors: [] }

    Object.keys(data).forEach((k) => {
      const el = data[k].value
      const rules = data[k].rules

      if (rules != undefined) {
        lineErrors.errors = this._validateField(rules, el, lineErrors)
      } else {
        lineErrors.errors.push({ column: k, error: 'Este campo não está definido no template' })
      }
    })
    return { valid: lineErrors.errors.length === 0, lineErrors }
  }

  _validateField(rules, el, lineErrors = { errors: [] }) {
    if (isRequired(rules)) {
      lineErrors.errors = this._validateFieldRequired(rules, el, lineErrors.errors)
    }
    if (isKey(rules) && this._isRequiredOrFill(rules, el)) {
      lineErrors.errors = this._validateFieldKey(rules, el, lineErrors.errors)
    }
    if (isTypeDate(rules) && this._isRequiredOrFill(rules, el)) {
      lineErrors.errors = this._validateFieldDate(rules, el, lineErrors.errors)
    }
    if (isTypeTime(rules) && this._isRequiredOrFill(rules, el)) {
      lineErrors.errors = this._validateFieldTime(rules, el, lineErrors.errors)
    }
    if (isTypeInt(rules) && this._isRequiredOrFill(rules, el)) {
      lineErrors.errors = this._validateFieldInt(rules, el, lineErrors.errors)
    }
    if (isTypeOptions(rules) && this._isRequiredOrFill(rules, el)) {
      lineErrors.errors = this._validateFieldOptions(rules, el, lineErrors.errors)
    }
    if (isTypeMultipleOptions(rules) && this._isRequiredOrFill(rules, el)) {
      lineErrors.errors = this._validateFieldMultipleOptions(rules, el, lineErrors.errors)
    }
    if (isTypeDecimal(rules) && this._isRequiredOrFill(rules, el)) {
      lineErrors.errors = this._validateFieldDecimal(rules, el, lineErrors.errors)
    }
    if (isTypeCep(rules) && this._isRequiredOrFill(rules, el)) {
      lineErrors.errors = this._validateFieldCep(rules, el, lineErrors.errors)
    }
    if (isTypeCepDistance(rules) && this._isRequiredOrFill(rules, el)) {
      lineErrors.errors = this._validateFieldCepDistance(rules, el, lineErrors.errors)
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
    if (isTypeDocument(rules) && this._isRequiredOrFill(rules, el)) {
      lineErrors.errors = this._validateFieldDocument(rules, el, lineErrors.errors)
    }

    if (isTypeListDocument(rules) && this._isRequiredOrFill(rules, el)) {
      lineErrors.errors = this._validateFieldListDocument(rules, el, lineErrors.errors)
    }

    if (isTypeResponsible(rules) && this._isRequiredOrFill(rules, el)) {
      lineErrors.errors = this._validateFieldResponsible(rules, el, lineErrors.errors)
    }

    return lineErrors.errors
  }

  validateArray(rules, el) {
    return true
  }

  _formatFieldCpfCnpj(fieldData) {
    let elText = fieldData.replace(/\./g, '')
    elText = elText.replace(/-/g, '')
    elText = elText.replace(/\\/g, '')
    elText = elText.replace(/\//g, '')

    return elText
  }

  _formatFieldPhoneNumber(fieldData) {
    let elText = fieldData.replace(/-/g, '')
    elText = elText.replace('(', '')
    elText = elText.replace(')', '')
    elText = elText.replace(' ', '')

    if (elText.length <= 8) return ''

    return elText
  }

  _formatFieldCep(fieldData) {
    return fieldData.replace(/-/g, '')
  }

  async _formatFieldCepDistance(fieldData) {
    const ceps = fieldData.split(':').map((cep) => {
      return this._formatFieldCep(cep)
    })

    const cepsStr = ceps.join(':')
    const cepDistanceData = {
      value: cepsStr,
      coordinates: {
        lat_source: 0,
        long_source: 0,
        lat_target: 0,
        long_target: 0,
        distance_in_km: 0
      }
    }

    return cepDistanceData
  }

  _formatFieldDecimal(fieldData) {
    let elText = fieldData
    if (String(elText).indexOf(',') >= 0) {
      elText = fieldData.replace('.', '')
      elText = elText.replace(',', '.')
    }

    return elText
  }

  _formatFieldArray(fieldRules, fieldData) {
    const arrData = []
    if (!fieldRules['fields']) {
      if (Array.isArray(fieldData)) {
        fieldData.forEach((element, x) => {
          if (String(element).length) {
            const item = {}
            item[fieldRules.column] = element
            arrData.push(item)
          }
        })
      }
    } else {
      if (Array.isArray(fieldData)) {
        const isArrayPhone = fieldRules.fields.filter((f) => f.type === 'phone_number').length > 0
        fieldData
          .filter((fd) => Object.keys(fd).filter((fdk) => String(fd[fdk]).length > 0).length > 0)
          .forEach((element) => {
            const item = {}
            const itemData = {}
            if (isArrayPhone) {
              fieldRules.fields.forEach((field) => {
                item[field.column] = element[field.column]
                itemData[field.data] = element[field.column]
              })

              if (itemData['customer_phone_number'] && parseInt(itemData['customer_phone_number']) === 0) return
              else if (itemData['customer_phone'] && parseInt(itemData['customer_phone']) === 0) return

              arrData.push(item)
            } else {
              fieldRules.fields.forEach((field) => {
                item[field.column] = element[field.column]
              })

              arrData.push(item)
            }
          })
      }
    }

    return arrData
  }

  _formatFieldOptions(fieldRules, fieldData) {
    if (!Array.isArray(fieldData)) return [fieldData]
    return fieldData
  }

  _formatFieldDocument(fieldRules, fieldData) {
    const document = { name: '', url: '', expiration_date: '4000-12-31', issue_date: moment().format('YYYY-MM-DD'), type: '' }
    document.url = fieldData.url
    document.name = fieldData.name
    document.type = fieldData.type
    if (fieldRules.has_expiration_date && fieldData.expiration_date) {
      document.expiration_date = fieldData.expiration_date
    }
    if (fieldRules.has_issue_date && fieldData.issue_date) {
      document.issue_date = fieldData.issue_date
    }
    return document
  }

  _formatFieldListDocument(fieldRules, fieldData) {
    return fieldData.map((f) => this._formatFieldDocument(fieldRules, f))
  }

  async format(data, rules) {
    const formatted = {}
    const fieldKeyList = Object.keys(data)

    for (const indexFieldKey in fieldKeyList) {
      const fieldKey = fieldKeyList[indexFieldKey]

      const el = data[fieldKey]
      const fieldRules = rules[fieldKey]

      let elText = el
      if (!fieldRules) {
        // console.log(fieldKey, el, fieldRules, rules)
      }

      if (isTypeCpfCnpj(fieldRules)) {
        elText = this._formatFieldCpfCnpj(elText)
      } else if (isTypePhoneNumber(fieldRules)) {
        elText = this._formatFieldPhoneNumber(elText)
      } else if (isTypeCepDistance(fieldRules)) {
        elText = await this._formatFieldCepDistance(elText)
      } else if (isTypeCep(fieldRules)) {
        elText = this._formatFieldCep(elText)
      } else if (isTypeDecimal(fieldRules)) {
        elText = this._formatFieldDecimal(elText)
      } else if (isTypeArray(fieldRules)) {
        elText = this._formatFieldArray(fieldRules, elText)
      } else if (isTypeOptions(fieldRules)) {
        elText = this._formatFieldOptions(fieldRules, elText)
      } else if (isTypeDocument(fieldRules)) {
        elText = this._formatFieldDocument(fieldRules, elText)
      } else if (isTypeListDocument(fieldRules)) {
        elText = this._formatFieldListDocument(fieldRules, elText)
      }
      formatted[fieldRules.column] = elText
    }

    formatted['_id'] = md5(new Date() + Math.random())
    return formatted
  }

  formatCustomer(data, rules) {
    const formatted = {}
    const fieldKeyList = Object.keys(data)
    for (const indexFieldKey in fieldKeyList) {
      const fieldKey = fieldKeyList[indexFieldKey]

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
        elText = this._formatCustomerFieldArray(fieldRules, elText)
      }

      formatted[fieldRules.data] = elText

      if (fieldRules.data === 'customer_phone_number') {
        if (formatted['customer_phone_number']) {
          if (formatted['customer_phone']) {
            formatted['customer_phone'] = [...formatted['customer_phone']]
            formatted['customer_phone'].push({ customer_phone_number: elText })
            delete formatted.customer_phone_number
          } else {
            formatted['customer_phone'] = [{ customer_phone_number: elText }]
            delete formatted.customer_phone_number
          }
        } else if (formatted['customer_phone']) {
          formatted['customer_phone'].push({ customer_phone_number: elText })
        }
      }
    }

    formatted['_id'] = md5(new Date() + Math.random())
    return formatted
  }

  _formatCustomerFieldArray(fieldRules, fieldData) {
    const arrData = []
    if (!fieldRules['fields']) {
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
        const isArrayPhone = fieldRules.fields.filter((f) => f.type === 'phone_number').length > 0
        fieldData
          .filter((fd) => Object.keys(fd).filter((fdk) => String(fd[fdk]).length > 0).length > 0)
          .forEach((element) => {
            const item = {}
            if (isArrayPhone) {
              fieldRules.fields.forEach((field) => {
                item[field.data] = element[field.column]
              })

              if (item['customer_phone_number'] && parseInt(item['customer_phone_number']) === 0) return
              else if (item['customer_phone'] && parseInt(item['customer_phone']) === 0) return

              arrData.push(item)
            } else {
              fieldRules.fields.forEach((field) => {
                item[field.data] = element[field.column]
              })

              arrData.push(item)
            }
          })
      }
    }

    return arrData
  }
}
