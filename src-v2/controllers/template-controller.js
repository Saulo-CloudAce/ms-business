const { validateFields, validateKey, hasCustomerFields } = require('../lib/template-validator')
const CompanyRepository = require('../repository/company-repository')
const TemplateRepository = require('../repository/template-repository')
const BusinessRepository = require('../repository/business-repository')
const { mongoIdIsValid } = require('../helpers/validators')
const { isTypeArray } = require('../helpers/field-methods')
const { isArrayObject } = require('../helpers/validators')

class TemplateController {
  _getInstanceRepositories (app) {
    const companyRepository = new CompanyRepository(app.locals.db)
    const templateRepository = new TemplateRepository(app.locals.db)
    const businessRepository = new BusinessRepository(app.locals.db)

    return { companyRepository, templateRepository, businessRepository }
  }

  async create (req, res) {
    req.assert('name', 'O nome é obrigatório').notEmpty()
    req.assert('fields', 'Os fields são obrigatórios').notEmpty()

    if (req.validationErrors()) return res.status(400).send({ errors: req.validationErrors() })

    const companyToken = req.headers['token']

    try {
      const { companyRepository, templateRepository } = this._getInstanceRepositories(req.app)

      const { name, fields } = req.body

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      const templatesCreated = await templateRepository.getAllByName(name, companyToken)
      if (templatesCreated.length > 0) return res.status(400).send({ error: `(${name}) já foi cadastrado.` })

      if (hasCustomerFields(fields)) {
        const keyValidated = validateKey(fields)
        if (!keyValidated) return res.status(400).send({ error: 'Defina um campo do template como chave' })
      }

      const fieldsValidated = validateFields(fields)

      if (fieldsValidated.errors.length) return res.status(400).send({ errors: fieldsValidated.errors })

      const template = await templateRepository.save(name, fieldsValidated.fields, companyToken, true)

      return res.status(201).send(template)
    } catch (err) {
      console.error('CREATE TEMPLATE ==>', err)
      return res.status(500).send({ error: 'Erro ao criar o template' })
    }
  }

  async activateTemplate (req, res) {
    const companyToken = req.headers['token']
    const templateId = req.params.id

    try {
      const { companyRepository, templateRepository } = this._getInstanceRepositories(req.app)

      if (!mongoIdIsValid(templateId)) return res.status(400).send({ error: 'ID não válido' })

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      const template = await templateRepository.getNameById(templateId, companyToken)
      if (!template) return res.status(400).send({ error: 'Template não identificado' })

      await templateRepository.updateActive(templateId, true)

      return res.status(200).send(template)
    } catch (err) {
      console.log(err)
      return res.status(500).send({ error: err.message })
    }
  }

  async deactivateTemplate (req, res) {
    const companyToken = req.headers['token']
    const templateId = req.params.id

    try {
      const { companyRepository, templateRepository } = this._getInstanceRepositories(req.app)

      if (!mongoIdIsValid(templateId)) return res.status(400).send({ error: 'ID não válido' })

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      const template = await templateRepository.getNameById(templateId, companyToken)
      if (!template) return res.status(400).send({ error: 'Template não identificado' })

      await templateRepository.updateActive(templateId, false)

      return res.status(200).send(template)
    } catch (err) {
      console.log(err)
      return res.status(500).send({ error: err.message })
    }
  }

  async getDataByTemplateId (req, res) {
    const companyToken = req.headers['token']
    const templateId = req.params.id

    try {
      const { companyRepository, templateRepository, businessRepository } = this._getInstanceRepositories(req.app)

      if (!mongoIdIsValid(templateId)) return res.status(400).send({ error: 'ID não válido' })

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      const template = await templateRepository.getNameById(templateId, companyToken)
      if (!template) return res.status(400).send({ error: 'Template não identificado' })

      const businessData = await businessRepository.listAllByTemplate(companyToken, templateId)
      template.data = businessData

      return res.status(200).send(template)
    } catch (err) {
      return res.status(500).send({ error: err.message })
    }
  }

  async getAll (req, res) {
    const companyToken = req.headers['token']

    try {
      const { companyRepository, templateRepository } = this._getInstanceRepositories(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      const templates = await templateRepository.getAllByCompany(companyToken)

      return res.status(200).send(templates)
    } catch (err) {
      console.log(err)
      return res.status(500).send({ error: err.message })
    }
  }

  async getById (req, res) {
    const companyToken = req.headers['token']
    const templateId = req.params.id

    try {
      const { companyRepository, templateRepository } = this._getInstanceRepositories(req.app)

      if (!mongoIdIsValid(templateId)) return res.status(400).send({ error: 'ID não válido' })

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      const template = await templateRepository.getById(templateId, companyToken)

      return res.status(200).send(template)
    } catch (err) {
      console.log(err)
      return res.status(500).send({ error: err.message })
    }
  }

  async update (req, res) {
    req.assert('name', 'O nome é obrigatório').notEmpty()
    req.assert('fields', 'Os fields são obrigatórios').notEmpty()

    const companyToken = req.headers['token']
    const templateId = req.params.id

    if (req.validationErrors()) return res.status(400).send({ errors: req.validationErrors() })

    try {
      const { name, fields } = req.body
      const { companyRepository, templateRepository } = this._getInstanceRepositories(req.app)

      if (!mongoIdIsValid(templateId)) return res.status(400).send({ error: 'ID não válido' })

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      const templatesCreated = await templateRepository.getAllByNameWhereIdNotIs(name, companyToken, templateId)
      if (templatesCreated.length) return res.status(400).send({ error: `(${name}) já foi cadastrado.` })

      const templateSaved = await templateRepository.getById(templateId, companyToken)
      if (!templateSaved) return res.status(400).send({ error: 'Template não existente' })

      templateSaved.name = name

      templateSaved.fields.forEach(field => {
        const updateField = fields.find(f => f.column === field.column)
        if (updateField.label.length && updateField.label !== field.label) field.label = updateField.label
        field.visible = updateField.visible
        field.operator_can_view = updateField.operator_can_view
        if (updateField.mask) field.mask = updateField.mask
        if (isTypeArray(field) && isArrayObject(field.fields)) {
          field.fields.forEach(subfield => {
            const updateSubfield = updateField.fields.find(sf => sf.column === subfield.column)
            if (updateSubfield.label.length && updateSubfield.label !== subfield.label) subfield.label = updateSubfield.label
            subfield.visible = updateSubfield.visible
            subfield.operator_can_view = updateSubfield.operator_can_view
            if (updateSubfield.mask) subfield.mask = updateSubfield.mask
          })
        }
      })

      const template = await templateRepository.update(templateId, companyToken, templateSaved)

      return res.status(200).send(template)
    } catch (err) {
      console.log(err)
      return res.status(500).send({ error: err.message })
    }
  }
}

module.exports = TemplateController
