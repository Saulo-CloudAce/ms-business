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

  async createFromUrlFile (req, res) {
    req.assert('name', 'Nome é obrigatório').notEmpty()
    req.assert('file', 'O arquivo é obrigatório').notEmpty()
    req.assert('templateId', 'O ID do template é obrigatório').notEmpty()
    req.assert('active_until', 'O active until é obrigatório').notEmpty()

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
      if (businessName.length > 0) return res.status(400).send({ err: `${req.body.name} já foi cadastrado` })

      const activeUntil = req.body.active_until

      console.log(req.body)

      const { businessId, invalids } = await this.newBusiness.createFromUrlFile(companyToken, req.body.name, req.body.file, template.fields, req.body.templateId, activeUntil)

      return res.status(201).send({ businessId, invalids })
    } catch (e) {
      return res.status(500).send({ err: e.message })
    }
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
      if (businessName.length > 0) return res.status(400).send({ err: `${req.body.name} já foi cadastrado` })

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

  async markBusinessFlowPassed (req, res) {
    const companyToken = req.headers['token']

    try {
      const company = await this.companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ err: 'Company não identificada.' })

      const businessId = req.params.id

      const business = await this.businessRepository.getById(companyToken, businessId)
      if (!business) return res.status(400).send({ err: 'Business não identificado' })

      await this.businessRepository.markFlowPassed(businessId)

      return res.sendStatus(200)
    } catch (e) {
      return res.status(500).send({ err: e.message })
    }
  }

  async unmarkBusinessFlowPassed (req, res) {
    const companyToken = req.headers['token']

    try {
      const company = await this.companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ err: 'Company não identificada.' })

      const businessId = req.params.id

      const business = await this.businessRepository.getById(companyToken, businessId)
      if (!business) return res.status(400).send({ err: 'Business não identificado' })

      await this.businessRepository.unmarkFlowPassed(businessId)

      return res.sendStatus(200)
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

  async getBusinessRegisterById (req, res) {
    const companyToken = req.headers['token']
    const templateId = req.headers['templateid']
console.log(companyToken)
    try {
      const company = await this.companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ err: 'Company não identificada.' })

      const template = await this.templateRepository.getById(templateId, companyToken)
      if (!template) return res.status(400).send({ err: 'Template não identificado' })

      const business = await this.newBusiness.getDataById(companyToken, req.params.businessId)
      if (!business) return res.status(400).send({ err: 'Business não identificado.' })
      var data = business.data.filter(d => d._id === req.params.registerId)

      var respBusiness = {
        _id: business._id,
        name: business.name
      }
      if (data && data.length > 0) respBusiness.data = data[0]

      return res.status(200).send(respBusiness)
    } catch (err) {
      return res.status(500).send({ err: err.message })
    }
  }

  async getBusinessAndRegisterIdByCpf (req, res) {
    const companyToken = req.headers['token']
    const templateId = req.headers['templateid']

    console.log(templateId)

    try {
      const company = await this.companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ err: 'Company não identificada.' })

      const template = await this.templateRepository.getById(templateId, companyToken)
      if (!template) return res.status(400).send({ err: 'Template não identificado' })

      var businessList = await this.newBusiness.getAllByTemplateId(companyToken, templateId)
      if (!businessList) return res.status(400).send({ err: 'Erro ao listar os business deste template.' })

      var cpfcnpj = req.query.cpfcnpj
      var response = {}

      var resBusiness = businessList.filter(b => {
        var res = {}
        var reg = b.data.filter(d => d.customer_cpfcnpj == cpfcnpj)
        if (reg && reg.length > 0) {
          res._id = b._id
          res.name = b.name
          res.createdAt = b.createdAt
          res.data = reg[0]
          return res
        }
      })
      if (resBusiness && resBusiness.length > 0) response = resBusiness[0]
      console.log(response.data)

      return res.status(200).send(response)
    } catch (err) {
      return res.status(500).send({ err: err.message })
    }
  }
}

module.exports = BusinessController
