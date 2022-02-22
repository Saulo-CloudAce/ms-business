import fs from 'fs'
import { validateFields, validateKey, hasCustomerFields } from '../lib/template-validator.js'
import CompanyRepository from '../repository/company-repository.js'
import TemplateRepository from '../repository/template-repository.js'
import BusinessRepository from '../repository/business-repository.js'
import { mongoIdIsValid } from '../helpers/validators.js'
import { isTypeArray } from '../helpers/field-methods.js'
import { isArrayObject } from '../helpers/validators.js'
import { generateCSV } from '../helpers/csv-generator.js'
import { generateExcel } from '../helpers/excel-generator.js'
import { sendEmail } from '../helpers/email-sender.js'
import QueryPredicate from '../repository/query-predicate.js'
import QueryPredicateError from '../repository/query-predicate-error.js'

export default class TemplateController {
  _getInstanceRepositories(app) {
    const companyRepository = new CompanyRepository(app.locals.db)
    const templateRepository = new TemplateRepository(app.locals.db)
    const businessRepository = new BusinessRepository(app.locals.db)

    return { companyRepository, templateRepository, businessRepository }
  }

  async create(req, res) {
    req.assert('name', 'O nome é obrigatório').notEmpty()
    req.assert('fields', 'Os fields são obrigatórios').notEmpty()

    if (req.validationErrors()) {
      return res.status(400).send({ errors: req.validationErrors() })
    }

    const companyToken = req.headers['token']

    let createdBy = 0

    try {
      const { companyRepository, templateRepository } = this._getInstanceRepositories(req.app)

      const { name, fields } = req.body
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

      const template = await templateRepository.save(name, fieldsValidated.fields, companyToken, true, createdBy)

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
      return res.status(500).send({ error: err.message })
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

      await templateRepository.updateActive(templateId, false, updatedBy)

      return res.status(200).send(template)
    } catch (err) {
      console.log(err)
      return res.status(500).send({ error: err.message })
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
      return res.status(500).send({ error: err.message })
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

      const template = await templateRepository.getById(templateId, companyToken)
      if (!template) {
        return res.status(400).send({ error: 'Template não identificado' })
      }

      const queryPredicate = new QueryPredicate(filterBy, template)

      const templateData = await businessRepository.listPaginatedDataByTemplateAndFilterByColumns(
        companyToken,
        templateId,
        queryPredicate,
        sortBy,
        limit,
        page
      )

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

    const sortBy = req.body.sort_by ? req.body.sort_by : []
    const filterRules = req.body.filter_rules ? req.body.filter_rules : []

    try {
      const { companyRepository, templateRepository, businessRepository } = this._getInstanceRepositories(req.app)

      if (!mongoIdIsValid(templateId)) {
        return res.status(400).send({ error: 'ID não válido' })
      }

      const company = await companyRepository.getByToken(companyToken)
      if (!company) {
        return res.status(400).send({ error: 'Company não identificada.' })
      }

      const template = await templateRepository.getById(templateId, companyToken)
      if (!template) {
        return res.status(400).send({ error: 'Template não identificado' })
      }

      const queryPredicate = new QueryPredicate(filterRules, template)

      const templateData = await businessRepository.listDataByTemplateAndFilterByColumns(companyToken, templateId, queryPredicate, sortBy)

      if (templateData.length === 0) {
        return res.status(404).send({ error: 'Não há dados para serem exportados' })
      }

      const templateFieldsIndexed = {}
      for (let i = 0; i < template.fields.length; i++) {
        const field = template.fields[i]
        templateFieldsIndexed[field.column] = field.label
      }

      const header = Object.keys(templateData[0]).map((k) => {
        return { key: `${k}`, header: `${templateFieldsIndexed[k]}` }
      })

      const filename = `${template.name}_search_result.xlsx`
      const filepath = `/tmp/${filename}`

      generateExcel(header, templateData, filepath).then(
        setTimeout(() => {
          const result = sendEmail(email, filepath, filename)
          if (result.error) {
            console.error('Ocorreu erro ao enviar o e-mail com o arquivo gerado.')
          } else {
            console.log('E-mail enviado com CSV gerado.')
          }
          fs.unlink(filepath, (err) => {
            if (err) console.error('Ocorreu erro ao excluir o CSV gerado.')
            else console.log('Arquivo CSV excluido.')
          })
        }, 5000)
      )

      return res
        .status(200)
        .send({ warn: `Em instantes será enviado um e-mail para ${email} contendo uma planilha com o resultado da busca.` })
    } catch (err) {
      console.error(err)
      return res.status(500).send({ error: 'Ocorreu erro ao exportar os registros do template informado' })
    }
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

      res.status(200).send({
        message: 'Estamos processando os dados e enviaremos uma planilha para o e-mail informado.'
      })

      const businessData = await businessRepository.listAllBatchesAndChildsByTemplateId(companyToken, templateId)

      const records = []
      businessData.forEach((bd) => {
        const data = bd.data && Array.isArray(bd.data) ? bd.data : []
        records.push(...data)
      })

      if (records.length === 0) {
        console.log('Template sem dados para exportar')
        return
      }

      const header = Object.keys(records[0]).map((k) => {
        return { id: `${k}`, title: `${k}` }
      })

      const filename = `${template.name}.csv`
      const filepath = `/tmp/${filename}`

      generateCSV(header, records, filepath).then(
        setTimeout(() => {
          const result = sendEmail(email, filepath, filename)
          if (result.error) {
            console.error('Ocorreu erro ao enviar o e-mail com o arquivo gerado.')
          } else {
            console.log('E-mail enviado com CSV gerado.')
          }
          fs.unlink(filepath, (err) => {
            if (err) console.error('Ocorreu erro ao excluir o CSV gerado.')
            else console.log('Arquivo CSV excluido.')
          })
        }, 5000)
      )
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
      console.log(err)
      return res.status(500).send({ error: err.message })
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
      console.log(err)
      return res.status(500).send({ error: err.message })
    }
  }

  async update(req, res) {
    req.assert('name', 'O nome é obrigatório').notEmpty()
    req.assert('fields', 'Os fields são obrigatórios').notEmpty()

    const companyToken = req.headers['token']
    const templateId = req.params.id

    if (req.validationErrors()) {
      return res.status(400).send({ errors: req.validationErrors() })
    }

    try {
      const { name, fields } = req.body
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

      templateSaved.fields = newFieldsValidated.fields

      const template = await templateRepository.update(templateId, companyToken, templateSaved, updatedBy)

      return res.status(200).send(template)
    } catch (err) {
      console.log(err)
      return res.status(500).send({ error: err.message })
    }
  }
}
