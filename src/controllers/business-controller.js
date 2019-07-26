const Business = require('../../domain/business')
const BusinessRepository = require('../repository/business-repository')
const Uploader = require('../lib/uploader')
const Validator = require('../lib/validator')
const mongodb = require('../../config/mongodb')
const crmService = require('../services/crm-service')

class BusinessController {
  constructor (businessService) {
    this.businessService = businessService
    this.businessRepository = new BusinessRepository(mongodb)
    this.uploader = new Uploader(process.env.BUCKET)
  }

  async create (req, res) {
    req.assert('name', 'Nome é obrigatório')
    req.assert('file', 'O arquivo é obrigatório')
    req.assert('fields', 'Os campos do arquivo são obrigatórios')
    req.assert('product', 'Produto é obrigatório')

    if (req.validationErrors()) {
      return res.status(400).send({ errors: req.validationErrors() })
    }

    try {
      const fields = JSON.parse(req.body.fields)
      const newBusiness = new Business(this.businessRepository, this.uploader, new Validator(), crmService)
      const { businessId, invalids } = await newBusiness.create(req.body.name, req.files.file, fields, req.body.product)

      return res.status(201).send({ businessId, invalids })
    } catch (e) {
      console.error(e)
      return res.status(500).send({ err: e.toString() })
    }
  }
}

module.exports = BusinessController
