const { validateFields, validateKey } = require('../lib/template-validator')
const CompanyRepository = require('../repository/company-repository')
const TemplateRepository = require('../repository/template-repository')
const BusinessRepository = require('../repository/business-repository')

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
      if (!company) return res.status(400).send({ err: 'Company não identificada.' })

      const templatesCreated = await templateRepository.getAllByName(name, companyToken)
      if (templatesCreated.length > 0) return res.status(400).send({ err: `(${name}) já foi cadastrado.` })

      var keyValidated = validateKey(fields)
      if (!keyValidated) return res.status(400).send({ err: 'Defina um campo do template como chave' })

      const fieldsValidated = validateFields(fields)

      if (fieldsValidated.errors.length) return res.status(400).send({ errors: fieldsValidated.errors })

      const template = await templateRepository.save(name, fieldsValidated.fields, companyToken, true)

      return res.status(201).send(template)
    } catch (err) {
      console.error('CREATE TEMPLATE ==>', err)
      return res.status(500).send({ err: 'Erro ao criar o template' })
    }
  }

  async activateTemplate (req, res) {
    const companyToken = req.headers['token']
    const templateId = req.params.id

    try {
      var { companyRepository, templateRepository } = this._getInstanceRepositories(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ err: 'Company não identificada.' })

      var template = await templateRepository.getNameById(templateId, companyToken)
      if (!template) return res.status(400).send({ err: 'Template não identificado' })

      await templateRepository.updateActive(templateId, true)

      return res.status(200).send(template)
    } catch (err) {
      console.log(err)
      return res.status(500).send({ err: err.message })
    }
  }

  async deactivateTemplate (req, res) {
    const companyToken = req.headers['token']
    const templateId = req.params.id

    try {
      var { companyRepository, templateRepository } = this._getInstanceRepositories(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ err: 'Company não identificada.' })

      var template = await templateRepository.getNameById(templateId, companyToken)
      if (!template) return res.status(400).send({ err: 'Template não identificado' })

      await templateRepository.updateActive(templateId, false)

      return res.status(200).send(template)
    } catch (err) {
      console.log(err)
      return res.status(500).send({ err: err.message })
    }
  }

  async getDataByTemplateId (req, res) {
    const companyToken = req.headers['token']
    const templateId = req.params.id

    try {
      var { companyRepository, templateRepository, businessRepository } = this._getInstanceRepositories(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ err: 'Company não identificada.' })

      var template = await templateRepository.getNameById(templateId, companyToken)
      if (!template) return res.status(400).send({ err: 'Template não identificado' })

      const businessData = await businessRepository.getAllByTemplate(companyToken, templateId)
      template.data = businessData

      return res.status(200).send(template)
    } catch (err) {
      return res.status(500).send({ err: err.message })
    }
  }

  async getAll (req, res) {
    const companyToken = req.headers['token']

    try {
      var { companyRepository, templateRepository } = this._getInstanceRepositories(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ err: 'Company não identificada.' })

      const templates = await templateRepository.getAllByCompany(companyToken)

      return res.status(200).send(templates)
    } catch (err) {
      console.log(err)
      return res.status(500).send({ err: err.message })
    }
  }

  async getById (req, res) {
    const companyToken = req.headers['token']

    try {
      var { companyRepository, templateRepository } = this._getInstanceRepositories(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ err: 'Company não identificada.' })

      const template = await templateRepository.getById(req.params.id, companyToken)

      return res.status(200).send(template)
    } catch (err) {
      console.log(err)
      return res.status(500).send({ err: err.message })
    }
  }
}

module.exports = TemplateController
