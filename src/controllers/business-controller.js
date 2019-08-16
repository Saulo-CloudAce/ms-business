const moment = require('moment')

const Business = require('../../domain/business')
const BusinessRepository = require('../repository/business-repository')
const CompanyRepository = require('../repository/company-repository')
const TemplateRepository = require('../repository/template-repository')
const Uploader = require('../lib/uploader')
const Validator = require('../lib/validator')
const mongodb = require('../../config/mongodb')
const crmService = require('../services/crm-service')

class BusinessController {
  constructor (businessService) {
    this.businessService = businessService
    this.businessRepository = new BusinessRepository(mongodb)
    this.uploader = new Uploader(process.env.BUCKET)
    this.companyRepository = new CompanyRepository(mongodb)
    this.templateRepository = new TemplateRepository(mongodb)
    this.newBusiness = new Business(this.businessRepository, this.uploader, new Validator(), crmService)
  }

  async create (req, res) {
    req.assert('name', 'Nome é obrigatório')
    req.assert('file', 'O arquivo é obrigatório')
    req.assert('templateId', 'O ID do template é obrigatório')
    req.assert('active_until', 'O active until é obrigatório')

    if (req.validationErrors()) {
      return res.status(400).send({ errors: req.validationErrors() })
    }

    const companyToken = req.headers['token']

    try {
      const company = await this.companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ err: 'Company não identificada.' })

      const template = await this.templateRepository.getById(req.body.templateId, companyToken)
      if (!template) return res.status(400).send({ err: 'Template não identificado' })
      if (!template.active) return res.status(400).send({ err: 'Este template foi desativado e não recebe mais dados.' })

      const businessList = await this.newBusiness.getAll(companyToken)
      const businessName = businessList.filter(b => b.name.toLowerCase() === req.body.name.toLowerCase())
      if (businessName.length > 0) return req.status(400).send({ err: `${req.body.name} já foi cadastrado` })

      const activeUntil = req.body.active_until

      const { businessId, invalids } = await this.newBusiness.create(companyToken, req.body.name, req.files.file, template.fields, req.body.templateId, activeUntil)

      return res.status(201).send({ businessId, invalids })
    } catch (e) {
      return res.status(500).send({ err: e.message })
    }
  }

  async createFromJson (req, res) {
    req.assert('name', 'Nome é obrigatório').notEmpty()
    req.assert('templateId', 'O ID do template é obrigatório').notEmpty()
    req.assert('data', 'Os dados são obrigatórios.').notEmpty()
    req.assert('active_until', 'O active until é obrigatório').notEmpty()

    if (req.validationErrors()) {
      return res.status(400).send({ errors: req.validationErrors() })
    }

    const companyToken = req.headers['token']

    try {
      const { name, templateId, data } = req.body
      const company = await this.companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ err: 'Company não identificada.' })

      const template = await this.templateRepository.getById(templateId, companyToken)
      if (!template) return res.status(400).send({ err: 'Template não identificado' })
      if (!template.active) return res.status(400).send({ err: 'Este template foi desativado e não recebe mais dados.' })

      const businessList = await this.newBusiness.getAll(companyToken)
      const businessName = businessList.filter(b => b.name.toLowerCase() === req.body.name.toLowerCase())
      if (businessName.length > 0) return res.status(400).send({ err: `(${req.body.name}) já foi cadastrado` })

      const activeUntil = req.body.active_until

      const { businessId, invalids } = await this.newBusiness.createFromJson(companyToken, name, template.fields, templateId, data, activeUntil)

      return res.status(201).send({ businessId, invalids })
    } catch (e) {
      return res.status(500).send({ err: e.message })
    }
  }

  async getAll (req, res) {
    const companyToken = req.headers['token']

    try {
      const company = await this.companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ err: 'Company não identificada.' })

      const businessList = await this.newBusiness.getAll(companyToken)

      return res.status(201).send(businessList)
    } catch (e) {
      return res.status(500).send({ err: e.message })
    }
  }

  async activateBusiness (req, res) {
    req.assert('active_until', 'O active until deve ser informado').notEmpty()

    if (req.validationErrors()) return res.status(400).send({ errors: req.validationErrors() })

    const companyToken = req.headers['token']

    try {
      const company = await this.companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ err: 'Company não identificada.' })

      const businessId = req.params.id

      const business = await this.businessRepository.getById(companyToken, businessId)
      if (!business) return res.status(400).send({ err: 'Business não identificado' })

      await this.businessRepository.activate(businessId, req.body.active_until)

      return res.sendStatus(200)
    } catch (e) {
      return res.status(500).send({ err: e.message })
    }
  }

  async deactivateBusiness (req, res) {
    const companyToken = req.headers['token']

    try {
      const company = await this.companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ err: 'Company não identificada.' })

      const businessId = req.params.id

      const business = await this.businessRepository.getById(companyToken, businessId)
      if (!business) return res.status(400).send({ err: 'Business não identificado' })

      await this.businessRepository.deactivate(businessId)

      return res.sendStatus(200)
    } catch (e) {
      return res.status(500).send({ err: e.message })
    }
  }

  async getByIdWithData (req, res) {
    const companyToken = req.headers['token']

    try {
      const company = await this.companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ err: 'Company não identificada.' })

      const business = await this.newBusiness.getDataById(companyToken, req.params.id)

      return res.status(201).send(business)
    } catch (e) {
      return res.status(500).send({ err: e.message })
    }
  }

  async deactivateExpiredBusiness() {
    try {
      const currentDate = moment().format('YYYY-MM-DD')
      const businessList = await this.businessRepository.getExpiredBusiness(currentDate)
      businessList.forEach(async b => {
        await this.businessRepository.deactivate(b._id)
      })
      return true
    } catch (err) {
      console.error(err)
      return true
    }
  }
}

module.exports = BusinessController
