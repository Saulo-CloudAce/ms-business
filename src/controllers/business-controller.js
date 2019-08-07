const Business = require('../../domain/business')
const BusinessRepository = require('../repository/business-repository')
const CompanyRepository = require('../repository/company-repository')
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
    this.newBusiness = new Business(this.businessRepository, this.uploader, new Validator(), crmService)
  }

  async create (req, res) {
    req.assert('name', 'Nome é obrigatório')
    req.assert('file', 'O arquivo é obrigatório')
    req.assert('fields', 'Os campos do arquivo são obrigatórios')

    if (req.validationErrors()) {
      return res.status(400).send({ errors: req.validationErrors() })
    }

    const companyToken = req.headers['token']

    try {
      const company = await this.companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ err: 'Company não identificada.' })

      const businessList = await this.newBusiness.getAll(companyToken)
      const businessName = businessList.filter(b => b.name.toLowerCase() === req.body.name.toLowerCase())
      if (businessName.length > 0) return req.status(400).send({ err: `${req.body.name} já foi cadastrado` })

      const fields = JSON.parse(req.body.fields)

      const { businessId, invalids } = await this.newBusiness.create(companyToken, req.body.name, req.files.file, fields)

      return res.status(201).send({ businessId, invalids })
    } catch (e) {
      return res.status(500).send({ err: e.message })
    }
  }

  async createFromJson (req, res) {
    req.assert('name', 'Nome é obrigatório').notEmpty()
    req.assert('fields', 'Os campos do arquivo são obrigatórios').notEmpty()
    req.assert('data', 'Os dados são obrigatórios.').notEmpty()

    if (req.validationErrors()) {
      return res.status(400).send({ errors: req.validationErrors() })
    }

    const companyToken = req.headers['token']

    try {
      const company = await this.companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ err: 'Company não identificada.' })

      const businessList = await this.newBusiness.getAll(companyToken)
      const businessName = businessList.filter(b => b.name.toLowerCase() === req.body.name.toLowerCase())
      if (businessName.length > 0) return res.status(400).send({ err: `(${req.body.name}) já foi cadastrado` })

      const { businessId, invalids } = await this.newBusiness.createFromJson(companyToken, req.body.name, req.body.fields, req.body.data)

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

  async getById (req, res) {
    const companyToken = req.headers['token']

    try {
      const company = await this.companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ err: 'Company não identificada.' })

      const business = await this.newBusiness.getById(companyToken, req.params.id)

      return res.status(201).send(business)
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
}

module.exports = BusinessController
