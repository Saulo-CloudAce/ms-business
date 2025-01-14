import fs from 'fs'
import { validateFields, validateKey, hasCustomerFields, hasResponsibleField } from '../lib/template-validator.js'
import CompanyRepository from '../repository/company-repository.js'
import TemplateRepository from '../repository/template-repository.js'
import BusinessRepository from '../repository/business-repository.js'
import { mongoIdIsValid } from '../helpers/validators.js'
import { generateExcel } from '../helpers/excel-generator.js'
import { sendSimpleEmail } from '../helpers/email-sender.js'
import QueryPredicate from '../repository/query-predicate.js'
import QueryPredicateError from '../repository/query-predicate-error.js'
import CacheService from '../services/cache-service.js'
import StorageService from '../services/storage-service.js'

import uploadFileFTP from '../helpers/upload-ftp.js'
import { generateCSV } from '../helpers/csv-generator.js'
import { Stream } from 'stream'
import ExcelJS from 'exceljs'
import { getCustomerByIdList } from '../services/crm-service.js'
import Business from '../../domain-v2/business.js'
import { isTypeMultipleOptions, isTypeOptions } from '../helpers/field-methods.js'
import { sanitizeFilename } from '../helpers/formatters.js'

export default class TemplateController {
  _getInstanceRepositories(app) {
    const cacheService = new CacheService(app.locals.redis)
    const storageService = new StorageService()

    const companyRepository = new CompanyRepository(app.locals.db)
    const templateRepository = new TemplateRepository(app.locals.db, cacheService)
    const businessRepository = new BusinessRepository(app.locals.db, cacheService)

    return { companyRepository, templateRepository, businessRepository, storageService }
  }

  async create(req, res) {
    const companyToken = req.headers['token']

    let createdBy = 0

    try {
      const { companyRepository, templateRepository } = this._getInstanceRepositories(req.app)

      const { name, auto_sponsor, fields, show_multiple_registers_per_customer } = req.body
      if (req.body.created_by && !isNaN(req.body.created_by)) {
        createdBy = parseInt(req.body.created_by)
      }

      const company = await companyRepository.getByToken(companyToken)
      if (!company) {
        return res.status(400).send({ error: 'Company não identificada.' })
      }

      const templatesCreated = await templateRepository.getAllByName(name, companyToken)
      if (templatesCreated.length > 0) {
        return res.status(400).send({ error: `(${name}) já foi cadastrado.` })
      }

      if (hasCustomerFields(fields)) {
        const keyValidated = validateKey(fields)
        if (!keyValidated) {
          return res.status(400).send({ error: 'Defina um campo do template como chave' })
        }
      }

      const fieldsValidated = validateFields(fields)

      if (fieldsValidated.errors.length) {
        return res.status(400).send({ errors: fieldsValidated.errors })
      }

      const showMultipleRegistersPerCustomer = String(show_multiple_registers_per_customer) === 'true'

      const autoSponsor = String(auto_sponsor) === 'true'
      if (autoSponsor && !hasResponsibleField(fields)) {
        return res.status(400).send({
          errors: [
            {
              error: 'O template precisa ter um campo do tipo `responsible` para ser definido como auto carteirização (auto_sponsor=true)'
            }
          ]
        })
      }

      const active = true

      const template = await templateRepository.save(name, fieldsValidated.fields, companyToken, autoSponsor, showMultipleRegistersPerCustomer, active, createdBy)

      return res.status(201).send(template)
    } catch (err) {
      console.error('CREATE TEMPLATE ==>', err)
      return res.status(500).send({ error: 'Erro ao criar o template' })
    }
  }

  async activateTemplate(req, res) {
    const companyToken = req.headers['token']
    const templateId = req.params.id

    let updatedBy = 0

    if (req.body.updated_by && !isNaN(req.body.updated_by)) {
      updatedBy = req.body.updated_by
    }

    try {
      const { companyRepository, templateRepository } = this._getInstanceRepositories(req.app)

      if (!mongoIdIsValid(templateId)) {
        return res.status(400).send({ error: 'ID não válido' })
      }

      const company = await companyRepository.getByToken(companyToken)
      if (!company) {
        return res.status(400).send({ error: 'Company não identificada.' })
      }

      const template = await templateRepository.getNameById(templateId, companyToken)
      if (!template) {
        return res.status(400).send({ error: 'Template não identificado' })
      }

      await templateRepository.updateActive(templateId, true, updatedBy)

      return res.status(200).send(template)
    } catch (err) {
      console.log(err)
      return res.status(500).send({ error: 'Ocorreu erro ao ativar o template' })
    }
  }

  async deactivateTemplate(req, res) {
    const companyToken = req.headers['token']
    const templateId = req.params.id

    let updatedBy = 0

    if (req.body.updated_by && !isNaN(req.body.updated_by)) {
      updatedBy = req.body.updated_by
    }

    try {
      const { companyRepository, templateRepository, businessRepository } = this._getInstanceRepositories(req.app)

      if (!mongoIdIsValid(templateId)) {
        return res.status(400).send({ error: 'ID não válido' })
      }

      const company = await companyRepository.getByToken(companyToken)
      if (!company) {
        return res.status(400).send({ error: 'Company não identificada.' })
      }

      const template = await templateRepository.getNameById(templateId, companyToken)
      if (!template) {
        return res.status(400).send({ error: 'Template não identificado' })
      }

      await templateRepository.updateActive(templateId, false, updatedBy)

      await businessRepository.deactivateAllByTemplate(companyToken, templateId, updatedBy)

      return res.status(200).send(template)
    } catch (err) {
      console.error(err)
      return res.status(500).send({ error: 'Ocorreu erro ao desativar o template' })
    }
  }

  async getDataByTemplateId(req, res) {
    const companyToken = req.headers['token']
    const templateId = req.params.id

    try {
      const { companyRepository, templateRepository, businessRepository } = this._getInstanceRepositories(req.app)

      if (!mongoIdIsValid(templateId)) {
        return res.status(400).send({ error: 'ID não válido' })
      }

      const company = await companyRepository.getByToken(companyToken)
      if (!company) {
        return res.status(400).send({ error: 'Company não identificada.' })
      }

      const template = await templateRepository.getNameById(templateId, companyToken)
      if (!template) {
        return res.status(400).send({ error: 'Template não identificado' })
      }

      const businessData = await businessRepository.listAllBatchesAndChildsByTemplate(companyToken, templateId)
      businessData.forEach((bd) => delete bd.childBatchesId)
      template.data = businessData

      return res.status(200).send(template)
    } catch (err) {
      console.error(err)
      return res.status(500).send({ error: 'Ocorreu erro todos dados do template' })
    }
  }

  async filterDataByTemplateIdWithPagination(req, res) {
    let page = 0
    let limit = 10
    const companyToken = req.headers['token']
    const templateId = req.params.id

    const sortBy = req.body.sort_by ? req.body.sort_by : []
    const filterBy = req.body.filter_rules ? req.body.filter_rules : []

    if (req.query.page && parseInt(req.query.page) >= 0) page = parseInt(req.query.page)
    if (req.query.limit && parseInt(req.query.limit) >= 0) limit = parseInt(req.query.limit)

    try {
      const { companyRepository, templateRepository, businessRepository } = this._getInstanceRepositories(req.app)

      if (!mongoIdIsValid(templateId)) {
        return res.status(400).send({ error: 'ID não válido' })
      }

      const company = await companyRepository.getByToken(companyToken)
      if (!company) {
        return res.status(400).send({ error: 'Company não identificada.' })
      }

      const template = await templateRepository.getByIdWithoutTags(templateId, companyToken)
      if (!template) {
        return res.status(400).send({ error: 'Template não identificado' })
      }

      const queryPredicate = new QueryPredicate(filterBy, template)

      const templateData = await businessRepository.listPaginatedDataByTemplateAndFilterByColumns(companyToken, templateId, queryPredicate, sortBy, limit, page)

      return res.status(200).send(templateData)
    } catch (err) {
      console.error(err)
      if (err instanceof QueryPredicateError) {
        return res.status(500).send({ error: err.message })
      }

      return res.status(500).send({ error: 'Ocorreu erro ao listar os registros do template informado' })
    }
  }

  async exportFilteredDataByTemplateId(req, res) {
    const companyToken = req.headers['token']
    const templateId = req.params.id
    const email = req.query.email
    if (!email) {
      return res.status(400).send({
        error: 'Informe um e-mail para enviar o arquivo com os dados'
      })
    }

    let frontendUrl = ''
    if (req.headers['frontend-url']) {
      frontendUrl = String(req.headers['frontend-url']).trim()
    }

    const canShowLink = frontendUrl.length > 0

    const sortBy = req.body.sort_by ? req.body.sort_by : []
    const filterRules = req.body.filter_rules ? req.body.filter_rules : []
    const fields = req.body.fields ? req.body.fields : []

    try {
      const { companyRepository, templateRepository, businessRepository, storageService } = this._getInstanceRepositories(req.app)

      if (!mongoIdIsValid(templateId)) {
        return res.status(400).send({ error: 'ID não válido' })
      }

      const company = await companyRepository.getByToken(companyToken)
      if (!company) {
        return res.status(400).send({ error: 'Company não identificada.' })
      }

      const template = await templateRepository.getByIdWithoutTags(templateId, companyToken)
      if (!template) {
        return res.status(400).send({ error: 'Template não identificado' })
      }

      const queryPredicate = new QueryPredicate(filterRules, template)

      let page = 0
      const limit = 100
      let templateData = []
      console.time('getDataPaginatedFiltered')
      const initData = await businessRepository.listPaginatedDataByTemplateAndFilterByColumns(companyToken, templateId, queryPredicate, [], limit, page)

      if (initData.data.length === 0) {
        return res.status(404).send({ error: 'Não há dados para serem exportados' })
      }

      res.status(200).send({ warn: `Em instantes será enviado um e-mail para ${email} contendo uma planilha com o resultado da busca.` })

      const filename = `${template.name.trim().replace(/ /g, '_')}_search_result.xlsx`
      const filepath = `/tmp/${filename}`

      const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
        filename: filepath
      })
      const worksheet = workbook.addWorksheet('Dados')

      console.log('initData', initData.pagination)
      if (initData.data.length) {
        templateData.push(...initData.data)

        templateData = this._formatDataToExport(templateData, template.fields)

        templateData = this._showJustFieldRequested(templateData, fields)

        let templateFieldsIndexed = {}
        const allFieldsIndexed = {}
        for (let i = 0; i < template.fields.length; i++) {
          const field = template.fields[i]
          allFieldsIndexed[field.column] = field.label
        }

        if (fields.length) {
          for (let i = 0; i < fields.length; i++) {
            const f = fields[i]
            if (allFieldsIndexed[f]) {
              templateFieldsIndexed[f] = allFieldsIndexed[f]
            }
          }
        } else {
          templateFieldsIndexed = allFieldsIndexed
        }

        const header = Object.keys(templateData[0])
          .filter((k) => templateFieldsIndexed[k])
          .map((k) => {
            return { key: `${k}`, header: `${templateFieldsIndexed[k]}` }
          })
        if (canShowLink) {
          header.push({ key: '_link_register', header: 'Link para acessar cadastro' })
        }

        worksheet.columns = header

        for (const r of templateData) {
          if (canShowLink) {
            r['_link_register'] = this.#generateLinkRegisterOnFrontend(frontendUrl, templateId, r.business_id.toString(), r._id)
          }

          worksheet.addRow(r).commit()
        }

        page += 1
        while (page <= initData.pagination.lastPage) {
          const logLabel = `${filename} - [${page}/${initData.pagination.lastPage}]`
          console.time(logLabel)
          let pageData = await businessRepository.listSkippedDataByTemplateAndFilterByColumns(companyToken, templateId, queryPredicate, [], limit, page)
          console.timeEnd(logLabel)

          pageData = this._formatDataToExport(pageData, template.fields)

          pageData = this._showJustFieldRequested(pageData, fields)

          // templateData.push(...pageData)
          for (const r of pageData) {
            if (canShowLink) {
              r['_link_register'] = this.#generateLinkRegisterOnFrontend(frontendUrl, templateId, r.business_id.toString(), r._id)
            }

            worksheet.addRow(r).commit()
          }
          page += 1
        }
      }
      console.timeEnd('getDataPaginatedFiltered')

      worksheet.commit()
      workbook.commit()

      setTimeout(async () => {
        const urlPrivate = await storageService.upload(companyToken, filepath, filename)
        const url = await storageService.getSignedUrl(urlPrivate)

        const subject = `Relatório de dados do CRM`
        const message = `Segue em anexo o relatório de dados do CRM. <br>
          Faça o download do arquivo pelo link abaixo: <br>
          <a href='${url}'>Baixar arquivo</a>`
        const result = sendSimpleEmail(email, subject, message)
        if (result.error) {
          console.error('Ocorreu erro ao enviar o e-mail com o arquivo gerado.')
        } else {
          console.log('E-mail enviado com CSV gerado.')
        }
      }, 10000)
    } catch (err) {
      console.error(err)
      return res.status(500).send({ error: 'Ocorreu erro ao exportar os registros do template informado' })
    }
  }

  #generateLinkRegisterOnFrontend(frontendUrl = '', templateId = '', businessId = '', registerId = '') {
    return `${frontendUrl}/customers/${templateId}/${businessId}/${registerId}`
  }

  _showJustFieldRequested(data = [], fields = []) {
    if (fields.length === 0) {
      return data
    }

    const dataFormatted = []

    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      const rowFormatted = {}

      for (let x = 0; x < fields.length; x++) {
        const f = fields[x]
        if (row[f]) {
          rowFormatted[f] = row[f]
        } else {
          rowFormatted[f] = ''
        }
      }

      dataFormatted.push(rowFormatted)
    }

    return dataFormatted
  }

  _formatDataToExport(data = [], fields = []) {
    data = this._formatDataFromFieldArray(data, fields)

    return data
  }

  _formatDataFromFieldArray(data = [], fields = []) {
    const fieldIndexed = {}
    const fieldsOptions = []
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i]
      if (f.fields) {
        fieldIndexed[f.column] = this._indexFieldArray(f.fields)
      } else if (isTypeOptions(f) || isTypeMultipleOptions(f)) {
        fieldsOptions.push(f)
      }
    }

    for (let i = 0; i < data.length; i++) {
      let linha = data[i]
      linha = this._formatRowWithArray(linha, fieldIndexed)
      linha = this._formatDataFieldOptions(linha, fieldsOptions)
    }

    return data
  }

  _formatDataFieldOptions(linha = {}, fields = []) {
    for (const f of fields) {
      let fieldOpt = linha[f.column]
      if (Array.isArray(fieldOpt)) {
        fieldOpt = fieldOpt.map((o) => o).filter((o) => o.length)
        fieldOpt = fieldOpt.join(',')
      }

      linha[f.column] = fieldOpt
    }
    return linha
  }

  _indexFieldArray(fields = []) {
    const fieldIndexed = {}
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i]
      if (f.fields) {
        fieldIndexed[f.column] = this._indexFieldArray(f.fields)
      } else {
        fieldIndexed[f.column] = f.label
      }
    }

    return fieldIndexed
  }

  _formatRowWithArray(row = {}, fieldIndexed = {}) {
    const fields = Object.keys(fieldIndexed)
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i]
      let data = row[field]

      if (Array.isArray(data) && data.length) {
        data = this._formatListDataFieldArray(data, fieldIndexed[field])
        row[field] = data
      } else {
        row[field] = ''
      }
    }

    return row
  }

  _formatListDataFieldArray(list = [], fieldArray = {}) {
    const fields = Object.keys(fieldArray)
    const items = []

    for (let x = 0; x < list.length; x++) {
      const item = list[x]
      const s = fields.map((f) => {
        const label = fieldArray[f]

        if (item[f]) {
          if (typeof label === 'object') {
            const rowData = this._formatListDataFieldArray(item[f], label)
            const text = `${f}: ${rowData}`
            return text
          } else {
            return `${label}: ${item[f]}`
          }
        } else if (!item[f]) {
          if (typeof label === 'object') {
            return `${f}: -`
          }
          return `${label}: -`
        }

        return `${label}: -`
      })
      items.push(s.join(', '))
    }

    return items.join(' | ')
  }

  async exportDataByTemplateId(req, res) {
    const companyToken = req.headers['token']
    const templateId = req.params.id
    const email = req.query.email
    if (!email) {
      return res.status(400).send({
        error: 'Informe um e-mail para enviar o arquivo com os dados'
      })
    }

    try {
      const { companyRepository, templateRepository, businessRepository, storageService } = this._getInstanceRepositories(req.app)

      if (!mongoIdIsValid(templateId)) {
        return res.status(400).send({ error: 'ID não válido' })
      }

      const company = await companyRepository.getByToken(companyToken)
      if (!company) {
        return res.status(400).send({ error: 'Company não identificada.' })
      }

      const template = await templateRepository.getByIdWithoutTags(templateId, companyToken)
      if (!template) {
        return res.status(400).send({ error: 'Template não identificado' })
      }

      res.status(200).send({
        message: `Estamos processando os dados e enviaremos uma planilha para o seu e-mail (${email}).`
      })

      let businessData = await businessRepository.listAllBatchesAndChildsByTemplateId(companyToken, templateId)

      let records = []
      businessData.forEach((bd) => {
        const data = bd.data && Array.isArray(bd.data) ? bd.data : []
        records.push(...data)
      })

      records = this._formatDataToExport(records, template.fields)

      if (records.length === 0) {
        console.log('Template sem dados para exportar')
        return
      }

      let templateFieldsIndexed = {}
      const allFieldsIndexed = { _id: 'ID' }
      for (let i = 0; i < template.fields.length; i++) {
        const field = template.fields[i]
        allFieldsIndexed[field.column] = field.label
      }

      templateFieldsIndexed = allFieldsIndexed

      const header = Object.keys(templateFieldsIndexed).map((k) => {
        return { key: `${k}`, header: `${templateFieldsIndexed[k]}` }
      })

      const filename = `${sanitizeFilename(template.name)}.xlsx`
      const filepath = `/tmp/${filename}`

      generateExcel(header, records, filepath).then(async () => {
        const urlPrivate = await storageService.upload(companyToken, filepath, filename)
        const url = await storageService.getSignedUrl(urlPrivate)
        setTimeout(() => {
          const subject = `Dados do template ${template.name}`
          const message = `Segue em anexo o arquivo com os dados do template ${template.name}. <br>
          Faça o download do arquivo pelo link abaixo: <br>
          <a href='${url}'>Baixar arquivo</a>`
          const result = sendSimpleEmail(email, subject, message)
          if (result.error) {
            console.error('Ocorreu erro ao enviar o e-mail com o arquivo gerado.')
          } else {
            console.log('E-mail enviado com CSV gerado.')
          }
        }, 5000)
      })
    } catch (err) {
      console.error(err)
      return res.status(500).send({ error: 'Ocorreu erro ao exportar os dados para arquivo CSV.' })
    }
  }

  async downloadExportDataByTemplateId(req, res) {
    const companyToken = req.headers['token']
    const templateId = req.params.id

    try {
      const { companyRepository, templateRepository, businessRepository, storageService } = this._getInstanceRepositories(req.app)

      if (!mongoIdIsValid(templateId)) {
        return res.status(400).send({ error: 'ID não válido' })
      }

      const company = await companyRepository.getByToken(companyToken)
      if (!company) {
        return res.status(400).send({ error: 'Company não identificada.' })
      }

      const template = await templateRepository.getByIdWithoutTags(templateId, companyToken)
      if (!template) {
        return res.status(400).send({ error: 'Template não identificado' })
      }

      let businessData = await businessRepository.listAllBatchesAndChildsByTemplateId(companyToken, templateId)

      let records = []
      businessData.forEach((bd) => {
        const data = bd.data && Array.isArray(bd.data) ? bd.data : []
        records.push(...data)
      })

      records = this._formatDataToExport(records, template.fields)

      if (records.length === 0) {
        console.log('Template sem dados para exportar')
        return res.status(200).send({ msg: 'O template não tem dados para exportar' })
      }

      let templateFieldsIndexed = {}
      const allFieldsIndexed = { _id: 'ID' }
      for (let i = 0; i < template.fields.length; i++) {
        const field = template.fields[i]
        allFieldsIndexed[field.column] = field.label
      }

      templateFieldsIndexed = allFieldsIndexed

      const header = Object.keys(templateFieldsIndexed).map((k) => {
        return { key: `${k}`, header: `${templateFieldsIndexed[k]}` }
      })

      const filename = `${sanitizeFilename(template.name)}.xlsx`
      const filepath = `/tmp/${filename}`
      console.log('generate file', filepath)

      await generateExcel(header, records, filepath)

      const urlPrivate = await storageService.upload(companyToken, filepath, filename)
      const url = await storageService.getSignedUrl(urlPrivate)
      console.log('download data from template', templateId, 'to file', filepath, 'finished')
      return res.status(200).send({ file_url: url })
    } catch (err) {
      console.error(err)
      return res.status(500).send({ error: 'Ocorreu erro ao exportar os dados para arquivo CSV.' })
    }
  }

  async getAll(req, res) {
    const companyToken = req.headers['token']

    try {
      const { companyRepository, templateRepository } = this._getInstanceRepositories(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) {
        return res.status(400).send({ error: 'Company não identificada.' })
      }

      const templates = await templateRepository.getAllByCompany(companyToken)

      return res.status(200).send(templates)
    } catch (err) {
      console.error(err)
      return res.status(500).send({ error: 'Ocorreu erro ao listar todos templates' })
    }
  }

  async getById(req, res) {
    const companyToken = req.headers['token']
    const templateId = req.params.id

    try {
      const { companyRepository, templateRepository } = this._getInstanceRepositories(req.app)

      if (!mongoIdIsValid(templateId)) {
        return res.status(400).send({ error: 'ID não válido' })
      }

      const company = await companyRepository.getByToken(companyToken)
      if (!company) {
        return res.status(400).send({ error: 'Company não identificada.' })
      }

      const template = await templateRepository.getById(templateId, companyToken)

      return res.status(200).send(template)
    } catch (err) {
      console.error(err)
      return res.status(500).send({ error: 'Ocorreu erro ao buscar o template pelo ID' })
    }
  }

  async listBusinessActiveByTemplateId(req, res) {
    const companyToken = req.headers['token']
    const templateId = req.params.id

    try {
      const { companyRepository, businessRepository } = this._getInstanceRepositories(req.app)

      if (!mongoIdIsValid(templateId)) {
        return res.status(400).send({ error: 'ID não válido' })
      }

      const company = await companyRepository.getByToken(companyToken)
      if (!company) {
        return res.status(400).send({ error: 'Company não identificada.' })
      }

      const businessList = await businessRepository.getAllBatchesActiveBasicByTemplateId(companyToken, templateId)
      const business = { data: [] }
      business.data = businessList.map((b) => {
        return {
          _id: b._id,
          name: b.name,
          activeUntil: b.activeUntil,
          active: b.active,
          aggregateMode: b.aggregateMode ? b.aggregateMode : AggregateModeType.INCREMENT,
          createdAt: b.createdAt,
          updatedAt: b.updatedAt,
          createdBy: b.createdBy ? b.createdBy : 0,
          updatedBy: b.updatedBy ? b.updatedBy : 0,
          dataAmount: b.quantityRows,
          flowPassed: b.flow_passed || b.flowPassed ? true : false,
          templateId: b.templateId
        }
      })

      return res.status(200).send(business)
    } catch (err) {
      console.error(err)
      return res.status(500).send({ error: 'Ocorreu erro ao listar os mailings ativos do template' })
    }
  }

  async getByIdWithoutTags(req, res) {
    const companyToken = req.headers['token']
    const templateId = req.params.id

    try {
      const { companyRepository, templateRepository } = this._getInstanceRepositories(req.app)

      if (!mongoIdIsValid(templateId)) {
        return res.status(400).send({ error: 'ID não válido' })
      }

      const company = await companyRepository.getByToken(companyToken)
      if (!company) {
        return res.status(400).send({ error: 'Company não identificada.' })
      }

      const template = await templateRepository.getByIdWithoutTags(templateId, companyToken)

      return res.status(200).send(template)
    } catch (err) {
      console.error(err)
      return res.status(500).send({ error: 'Ocorreu erro ao buscar o template pelo ID sem os campos de tag' })
    }
  }

  async update(req, res) {
    const companyToken = req.headers['token']
    const templateId = req.params.id

    try {
      const { name, auto_sponsor, fields, show_multiple_registers_per_customer } = req.body
      let updatedBy = 0

      if (req.body.updated_by && !isNaN(req.body.updated_by)) {
        updatedBy = req.body.updated_by
      }
      const { companyRepository, templateRepository } = this._getInstanceRepositories(req.app)

      if (!mongoIdIsValid(templateId)) {
        return res.status(400).send({ error: 'ID não válido' })
      }

      const company = await companyRepository.getByToken(companyToken)
      if (!company) {
        return res.status(400).send({ error: 'Company não identificada.' })
      }

      const templatesCreated = await templateRepository.getAllByNameWhereIdNotIs(name, companyToken, templateId)
      if (templatesCreated.length) {
        return res.status(400).send({ error: `(${name}) já foi cadastrado.` })
      }

      const templateSaved = await templateRepository.getById(templateId, companyToken)
      if (!templateSaved) {
        return res.status(400).send({ error: 'Template não existente' })
      }

      templateSaved.name = name

      const newFieldsValidated = validateFields(fields)
      if (newFieldsValidated.errors.length) {
        return res.status(400).send({ errors: newFieldsValidated.errors })
      }

      const showMultipleRegistersPerCustomer = String(show_multiple_registers_per_customer) === 'true'

      const autoSponsor = String(auto_sponsor) === 'true'
      if (autoSponsor && !hasResponsibleField(newFieldsValidated.fields)) {
        return res.status(400).send({
          errors: [
            {
              error: 'O template precisa ter um campo do tipo `responsible` para ser definido como auto carteirização (auto_sponsor=true)'
            }
          ]
        })
      }

      templateSaved.show_multiple_registers_per_customer = showMultipleRegistersPerCustomer
      templateSaved.auto_sponsor = autoSponsor
      templateSaved.fields = newFieldsValidated.fields

      const template = await templateRepository.update(templateId, companyToken, templateSaved, updatedBy)

      return res.status(200).send(template)
    } catch (err) {
      console.error(err)
      return res.status(500).send({ error: 'Ocorreu erro ao atualizar o template' })
    }
  }

  async getCustomersByIdAndTemplateId(req, res) {
    const companyToken = req.headers['token']
    const templateId = req.params.id
    const customersSearch = req.body.customers_search // [1000,2000]
    try {
      const { companyRepository, templateRepository, businessRepository } = this._getInstanceRepositories(req.app)

      const businessDomain = new Business(businessRepository)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      const request = await getCustomerByIdList(customersSearch, companyToken)
      let customers = request.data

      customers = customers
        .filter((c) => Array.isArray(c.business_template_list) && c.business_template_list.find((tl) => tl === templateId))
        .map((c) => {
          c.business_template_list = [templateId]
          return c
        })

      customers = await businessDomain.getLastMailingByCustomerListAndTemplateAndKeySortedReverse(companyToken, customers, templateId, templateRepository)
      return res.status(200).send(customers)
    } catch (err) {
      console.error(err)
      return res.status(500).send({ error: 'Ocorreu erro ao buscar os clientes por template' })
    }
  }
}
