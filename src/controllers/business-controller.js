const moment = require('moment')

const Business = require('../../domain/business')
const BusinessRepository = require('../repository/business-repository')
const CompanyRepository = require('../repository/company-repository')
const TemplateRepository = require('../repository/template-repository')
const Uploader = require('../lib/uploader')
const Validator = require('../lib/validator')
const crmService = require('../services/crm-service')
const { mongoIdIsValid } = require('../helpers/validators')

class BusinessController {
  constructor (businessService) {
    this.businessService = businessService
    this.uploader = new Uploader(process.env.BUCKET)
  }

  _getInstanceRepositories (app) {
    const businessRepository = new BusinessRepository(app.locals.db)
    const companyRepository = new CompanyRepository(app.locals.db)
    const templateRepository = new TemplateRepository(app.locals.db)

    return { businessRepository, companyRepository, templateRepository }
  }

  _getInstanceBusiness (app) {
    var { businessRepository } = this._getInstanceRepositories(app)
    return new Business(businessRepository, this.uploader, new Validator(), crmService)
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
      const { companyRepository, templateRepository } = this._getInstanceRepositories(req.app)
      const newBusiness = this._getInstanceBusiness(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ err: 'Company não identificada.' })

      const template = await templateRepository.getById(req.body.templateId, companyToken)
      if (!template) return res.status(400).send({ err: 'Template não identificado' })
      if (!template.active) return res.status(400).send({ err: 'Este template foi desativado e não recebe mais dados.' })

      const businessList = await newBusiness.getAll(companyToken)
      const businessName = businessList.filter(b => b.name.toLowerCase() === req.body.name.toLowerCase())
      if (businessName.length > 0) return res.status(400).send({ err: `${req.body.name} já foi cadastrado` })

      const activeUntil = req.body.active_until
      var jumpFirstLine = (req.body.jump_first_line) ? req.body.jump_first_line : false

      var dataSeparator = (req.body.data_separator) ? req.body.data_separator : ';'

      const { businessId, invalids } = await newBusiness.createFromUrlFile(companyToken, req.body.name, req.body.file, template.fields, req.body.templateId, activeUntil, company.prefix_index_elastic, jumpFirstLine, dataSeparator)

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
      const { companyRepository, templateRepository } = this._getInstanceRepositories(req.app)
      const newBusiness = this._getInstanceBusiness(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ err: 'Company não identificada.' })

      const template = await templateRepository.getById(req.body.templateId, companyToken)
      if (!template) return res.status(400).send({ err: 'Template não identificado' })
      if (!template.active) return res.status(400).send({ err: 'Este template foi desativado e não recebe mais dados.' })

      const businessList = await newBusiness.getAll(companyToken)
      const businessName = businessList.filter(b => b.name.toLowerCase() === req.body.name.toLowerCase())
      if (businessName.length > 0) return res.status(400).send({ err: `${req.body.name} já foi cadastrado` })

      const activeUntil = req.body.active_until
      var jumpFirstLine = (req.body.jump_first_line) ? (req.body.jump_first_line.toLowerCase() === 'true') : false

      var dataSeparator = (req.body.data_separator) ? req.body.data_separator : ';'

      const { businessId, invalids } = await newBusiness.create(companyToken, req.body.name, req.files.file, template.fields, req.body.templateId, activeUntil, company.prefix_index_elastic, jumpFirstLine, dataSeparator)

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

      const { companyRepository, templateRepository } = this._getInstanceRepositories(req.app)
      const newBusiness = this._getInstanceBusiness(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ err: 'Company não identificada.' })

      const template = await templateRepository.getById(templateId, companyToken)
      if (!template) return res.status(400).send({ err: 'Template não identificado' })
      if (!template.active) return res.status(400).send({ err: 'Este template foi desativado e não recebe mais dados.' })

      const businessList = await newBusiness.getAll(companyToken)
      const businessName = businessList.filter(b => b.name.toLowerCase() === req.body.name.toLowerCase())
      if (businessName.length > 0) return res.status(400).send({ err: `(${req.body.name}) já foi cadastrado` })

      const activeUntil = req.body.active_until

      const { businessId, invalids } = await newBusiness.createFromJson(companyToken, name, template.fields, templateId, data, activeUntil, company.prefix_index_elastic, req.body)

      return res.status(201).send({ businessId, invalids })
    } catch (e) {
      console.error(e)
      return res.status(500).send({ err: e.message })
    }
  }

  async getPoolData (req, res) {
    const companyToken = req.headers['token']

    try {
      const { companyRepository, businessRepository } = this._getInstanceRepositories(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ err: 'Company não identificada.' })

      var searchData = req.body.data
      var fields = []
      if (req.body.fields) fields = req.body.fields
      fields.push('_id')

      var businessData = []

      if (searchData && Array.isArray(searchData)) {
        var listBusinessId = searchData.map(s => s.lote_id)
        var businessList = await businessRepository.getDataByListId(companyToken, listBusinessId)
        var listDataId = searchData.map(s => s.item_id)
        businessList.forEach((business) => {
          business.data
            .filter(d => listDataId.includes(d._id))
            .forEach((it) => {
              var item = it
              if (fields.length > 1) {
                item = Object.keys(item)
                  .filter(k => fields.includes(k))
                  .reduce((obj, k) => {
                    obj[k] = item[k]
                    return obj
                  }, {})
              }
              businessData.push(item)
            })
        })
      }

      return res.status(200).send(businessData)
    } catch (err) {
      return res.status(500).send({ err: err.message })
    }
  }

  async getAll (req, res) {
    const companyToken = req.headers['token']

    try {
      const { companyRepository } = this._getInstanceRepositories(req.app)
      const newBusiness = this._getInstanceBusiness(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ err: 'Company não identificada.' })

      const businessList = await newBusiness.getAll(companyToken)
      var business = businessList.map(b => {
        return {
          _id: b._id,
          name: b.name,
          activeUntil: b.activeUntil,
          active: b.active,
          createdAt: b.createdAt,
          updatedAt: b.updatedAt,
          dataAmount: b.data.length,
          templateId: b.templateId
        }
      })

      return res.status(201).send(business)
    } catch (e) {
      return res.status(500).send({ err: e.message })
    }
  }

  async markBusinessFlowPassed (req, res) {
    const companyToken = req.headers['token']

    const businessId = req.params.id
    if (!mongoIdIsValid(businessId)) return res.status(500).send({ err: 'Código do lote inválido' })

    try {
      const { companyRepository, businessRepository } = this._getInstanceRepositories(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ err: 'Company não identificada.' })

      const business = await businessRepository.getById(companyToken, businessId)
      if (!business) return res.status(400).send({ err: 'Business não identificado' })

      await businessRepository.markFlowPassed(businessId)

      return res.sendStatus(200)
    } catch (e) {
      return res.status(500).send({ err: e.message })
    }
  }

  async unmarkBusinessFlowPassed (req, res) {
    const companyToken = req.headers['token']

    const businessId = req.params.id
    if (!mongoIdIsValid(businessId)) return res.status(500).send({ err: 'Código do lote inválido' })

    try {
      const { companyRepository, businessRepository } = this._getInstanceRepositories(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ err: 'Company não identificada.' })

      const business = await businessRepository.getById(companyToken, businessId)
      if (!business) return res.status(400).send({ err: 'Business não identificado' })

      await businessRepository.unmarkFlowPassed(businessId)

      return res.sendStatus(200)
    } catch (e) {
      return res.status(500).send({ err: e.message })
    }
  }

  async activateBusiness (req, res) {
    req.assert('active_until', 'O active until deve ser informado').notEmpty()

    if (req.validationErrors()) return res.status(400).send({ errors: req.validationErrors() })

    const companyToken = req.headers['token']

    const businessId = req.params.id
    if (!mongoIdIsValid(businessId)) return res.status(500).send({ err: 'Código do lote inválido' })

    try {
      const { companyRepository, businessRepository } = this._getInstanceRepositories(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ err: 'Company não identificada.' })

      const business = await businessRepository.getById(companyToken, businessId)
      if (!business) return res.status(400).send({ err: 'Business não identificado' })

      await businessRepository.activate(businessId, req.body.active_until)

      return res.sendStatus(200)
    } catch (e) {
      return res.status(500).send({ err: e.message })
    }
  }

  async deactivateBusiness (req, res) {
    const companyToken = req.headers['token']

    const businessId = req.params.id
    if (!mongoIdIsValid(businessId)) return res.status(500).send({ err: 'Código do lote inválido' })

    try {
      const { companyRepository, businessRepository } = this._getInstanceRepositories(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ err: 'Company não identificada.' })

      const business = await businessRepository.getById(companyToken, businessId)
      if (!business) return res.status(400).send({ err: 'Business não identificado' })

      await businessRepository.deactivate(businessId)

      return res.sendStatus(200)
    } catch (e) {
      return res.status(500).send({ err: e.message })
    }
  }

  async searchDataInBusiness (req, res) {
    const companyToken = req.headers['token']

    try {
      const { companyRepository, businessRepository } = this._getInstanceRepositories(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ err: 'Company não identificada.' })

      const searchParams = req.body.search_params

      var businessList = await businessRepository.getAllByTemplate(companyToken, req.body.template_id)
var resultList = []
      var dataList = businessList.filter((b) => {
	var dataR = b.data.filter(r => Object.values(r).includes(searchParams.value))
if (dataR.length > 0) {
var b1 = b
b1.data = dataR
resultList.push(b1)
}
	return (dataR.length > 0)
      })

      return res.status(201).send(resultList)
    } catch (e) {
      return res.status(500).send({ err: e.message })
    }
  }

  async getByIdWithData (req, res) {
    const companyToken = req.headers['token']

    try {
      const { companyRepository } = this._getInstanceRepositories(req.app)
      const newBusiness = this._getInstanceBusiness(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ err: 'Company não identificada.' })

      const business = await newBusiness.getDataById(companyToken, req.params.id)

      return res.status(201).send(business)
    } catch (e) {
      return res.status(500).send({ err: e.message })
    }
  }

  async deactivateExpiredBusiness () {
    const app = require('../../config/server')
    try {
      const { businessRepository } = this._getInstanceRepositories(app)
      const currentDate = moment().format('YYYY-MM-DD')
      const businessList = await businessRepository.getExpiredBusiness(currentDate)
      businessList.forEach(async b => {
        await businessRepository.deactivate(b._id)
      })
      return true
    } catch (err) {
      console.error(err)
      return true
    }
  }

  async updateBusinessRegisterById (req, res) {
    const companyToken = req.headers['token']
    const templateId = req.headers['templateid']
    const registerId = req.params.registerId
    const businessId = req.params.businessId

    try {
      const { companyRepository, templateRepository } = this._getInstanceRepositories(req.app)
      const newBusiness = this._getInstanceBusiness(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ err: 'Company não identificada.' })

      const template = await templateRepository.getById(templateId, companyToken)
      if (!template) return res.status(400).send({ err: 'Template não identificado' })

      var fieldEditableList = template.fields.filter(f => f.editable)
      if (!Array.isArray(fieldEditableList)) fieldEditableList = []

      const business = await newBusiness.getDataById(companyToken, businessId)
      if (!business) return res.status(400).send({ err: 'Business não identificado.' })

      var register = null

      business.data.forEach(d => {
        if (d._id === registerId) {
          fieldEditableList.forEach(f => {
            if (req.body[f.data] && req.body[f.data].length > 0) {
              d[f.data] = req.body[f.data]
            }
          })
          register = d
        }
      })

      await newBusiness.updateDataBusiness(businessId, business.data)

      return res.status(200).send(register)
    } catch (err) {
      console.error(err)
      return res.status(500).send({ err: err.message })
    }
  }

  async getBusinessRegisterById (req, res) {
    const companyToken = req.headers['token']
    const templateId = req.headers['templateid']

    try {
      const { companyRepository, templateRepository } = this._getInstanceRepositories(req.app)
      const newBusiness = this._getInstanceBusiness(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ err: 'Company não identificada.' })

      const template = await templateRepository.getById(templateId, companyToken)
      if (!template) return res.status(400).send({ err: 'Template não identificado' })

      const business = await newBusiness.getDataById(companyToken, req.params.businessId)
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

    try {
      const { companyRepository, templateRepository } = this._getInstanceRepositories(req.app)
      const newBusiness = this._getInstanceBusiness(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ err: 'Company não identificada.' })

      const template = await templateRepository.getById(templateId, companyToken)
      if (!template) return res.status(400).send({ err: 'Template não identificado' })

      var businessList = await newBusiness.getAllByTemplateId(companyToken, templateId)
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

      return res.status(200).send(response)
    } catch (err) {
      return res.status(500).send({ err: err.message })
    }
  }
}

module.exports = BusinessController
