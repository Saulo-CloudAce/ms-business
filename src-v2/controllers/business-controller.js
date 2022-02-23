import moment from 'moment'

import Business from '../../domain-v2/business.js'
import BusinessRepository from '../repository/business-repository.js'
import CompanyRepository from '../repository/company-repository.js'
import TemplateRepository from '../repository/template-repository.js'
import Uploader from '../lib/uploader.js'
import Validator from '../lib/validator.js'
import * as crmService from '../services/crm-service.js'
import { mongoIdIsValid } from '../helpers/validators.js'
import { normalizeArraySubfields } from '../lib/data-transform.js'
import { calcExpireTime } from '../helpers/util.js'
import { AggregateModeType } from '../../domain-v2/aggregate-mode-enum.js'

export default class BusinessController {
  constructor(businessService) {
    this.businessService = businessService
    this.uploader = new Uploader(process.env.BUCKET)
  }

  _getInstanceRepositories(app) {
    const businessRepository = new BusinessRepository(app.locals.db)
    const companyRepository = new CompanyRepository(app.locals.db)
    const templateRepository = new TemplateRepository(app.locals.db)

    return { businessRepository, companyRepository, templateRepository }
  }

  _getInstanceBusiness(app) {
    const { businessRepository } = this._getInstanceRepositories(app)
    return new Business(businessRepository, this.uploader, new Validator(), crmService)
  }

  async createFromUrlFile(req, res) {
    console.log('createFromUrlFile')
    req.assert('name', 'Nome é obrigatório').notEmpty()
    req.assert('file', 'O arquivo é obrigatório').notEmpty()
    req.assert('templateId', 'O ID do template é obrigatório').notEmpty()
    req.assert('active_until', 'O active until é obrigatório').notEmpty()

    if (req.validationErrors()) {
      return res.status(400).send({ errors: req.validationErrors() })
    }

    const companyToken = req.headers['token']
    const templateId = req.body.templateId
    const activeUntil = req.body.active_until
    const name = req.body.name
    const urlFile = req.body.file
    let createdBy = 0
    if (req.body.created_by && !isNaN(req.body.created_by)) {
      createdBy = parseInt(req.body.created_by)
    }

    if (req.body.aggregate_mode && !Object.values(AggregateModeType).includes(req.body.aggregate_mode)) {
      return res.status(400).send({
        errors: `O aggregate_mode pode ser ${Object.values(AggregateModeType).join(',')}`
      })
    }

    try {
      const aggregateMode = req.body.aggregate_mode ? req.body.aggregate_mode : AggregateModeType.INCREMENT

      if (!mongoIdIsValid(templateId)) return res.status(400).send({ error: 'O ID do template é inválido' })

      if (moment(activeUntil, 'YYYY-MM-DD').format('YYYY-MM-DD') !== activeUntil)
        return res.status(400).send({
          error: 'A data active_until está com formato inválido. O formato válido é YYYY-MM-DD'
        })
      if (moment(activeUntil, 'YYYY-MM-DD').diff(moment().format('YYYY-MM-DD')) < 0)
        return res.status(400).send({
          error: 'A data active_until não pode ser anterior a data de hoje, somente igual ou posterior'
        })

      const { companyRepository, templateRepository } = this._getInstanceRepositories(req.app)
      const newBusiness = this._getInstanceBusiness(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: '#00010 - Company não identificada.' })

      const template = await templateRepository.getById(templateId, companyToken)
      if (!template) return res.status(400).send({ error: '#00011 - Template não identificado' })
      if (!template.active)
        return res.status(400).send({
          error: '#00012 - Este template foi desativado e não recebe mais dados.'
        })

      const businessList = await newBusiness.getByNameAndTemplateId(companyToken, req.body.name, templateId)
      if (businessList.length) return res.status(400).send({ error: `${req.body.name} já foi cadastrado` })

      const jumpFirstLine = req.body.jump_first_line ? req.body.jump_first_line : false

      let dataSeparator = ';'
      if (req.body.data_separator) {
        if (req.body.data_separator === ',' || req.body.data_separator === 'v') dataSeparator = ','
        else dataSeparator = req.body.data_separator
      }

      const { businessId, invalids } = await newBusiness.createFromUrlFile(
        companyToken,
        name,
        urlFile,
        template.fields,
        templateId,
        activeUntil,
        company.prefix_index_elastic,
        jumpFirstLine,
        dataSeparator,
        createdBy,
        aggregateMode
      )
      if (businessId === null) return res.status(400).send({ error: invalids })

      if (invalids.length) return res.status(400).send({ businessId, invalids })
      return res.status(201).send({ businessId })
    } catch (e) {
      const errCode = '00014'
      console.error(`#${errCode}`, e.message)
      return res.status(500).send({ error: `#${errCode}` })
    }
  }

  async create(req, res) {
    req.assert('name', 'Nome é obrigatório')
    req.assert('file', 'O arquivo é obrigatório')
    req.assert('templateId', 'O ID do template é obrigatório')
    req.assert('active_until', 'O active until é obrigatório')

    if (req.validationErrors()) {
      return res.status(400).send({ errors: req.validationErrors() })
    }

    const companyToken = req.headers['token']
    const templateId = req.body.templateId
    const activeUntil = req.body.active_until
    const businessName = req.body.name

    let createdBy = 0
    if (req.body.created_by && !isNaN(req.body.created_by)) {
      createdBy = parseInt(req.body.created_by)
    }

    try {
      if (!mongoIdIsValid(templateId)) return res.status(400).send({ error: 'O ID do template é inválido' })

      if (moment(activeUntil, 'YYYY-MM-DD').format('YYYY-MM-DD') !== activeUntil)
        return res.status(400).send({
          error: 'A data active_until está com formato inválido. O formato válido é YYYY-MM-DD'
        })
      if (moment(activeUntil, 'YYYY-MM-DD').diff(moment().format('YYYY-MM-DD')) < 0)
        return res.status(400).send({
          error: 'A data active_until não pode ser anterior a data de hoje, somente igual ou posterior'
        })

      const { companyRepository, templateRepository } = this._getInstanceRepositories(req.app)
      const newBusiness = this._getInstanceBusiness(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      const template = await templateRepository.getById(templateId, companyToken)
      if (!template) return res.status(400).send({ error: 'Template não identificado' })
      if (!template.active)
        return res.status(400).send({
          error: 'Este template foi desativado e não recebe mais dados.'
        })

      const businessList = await newBusiness.getByNameAndTemplateId(companyToken, businessName, templateId)
      if (businessList.length) return res.status(400).send({ error: `${businessName} já foi cadastrado` })

      const jumpFirstLine = req.body.jump_first_line ? req.body.jump_first_line.toLowerCase() === 'true' : false

      let dataSeparator = ';'
      if (req.body.data_separator) {
        if (req.body.data_separator === ',' || req.body.data_separator === 'v') dataSeparator = ','
        else dataSeparator = req.body.data_separator
      }

      const { businessId, invalids } = await newBusiness.create(
        companyToken,
        req.body.name,
        req.files.file,
        template.fields,
        templateId,
        activeUntil,
        company.prefix_index_elastic,
        jumpFirstLine,
        dataSeparator,
        createdBy
      )
      if (businessId === null) return res.status(400).send({ error: invalids })

      if (invalids.length) return res.status(400).send({ businessId, invalids })
      return res.status(201).send({ businessId })
    } catch (e) {
      console.error(e)
      return res.status(500).send({ error: e.message })
    }
  }

  async createFromJson(req, res) {
    console.log('createFromJson')
    const companyToken = req.headers['token']

    if (req.body.aggregate_mode && !Object.values(AggregateModeType).includes(req.body.aggregate_mode)) {
      return res.status(400).send({
        errors: `O aggregate_mode pode ser ${Object.values(AggregateModeType).join(',')}`
      })
    }

    try {
      const { name, templateId, data } = req.body
      const aggregateMode = req.body.aggregate_mode ? req.body.aggregate_mode : AggregateModeType.INCREMENT
      const activeUntil = req.body.active_until

      let createdBy = 0
      if (req.body.created_by && !isNaN(req.body.created_by)) {
        createdBy = parseInt(req.body.created_by)
      }

      if (moment(activeUntil, 'YYYY-MM-DD').format('YYYY-MM-DD') !== activeUntil)
        return res.status(400).send({
          error: 'A data active_until está com formato inválido. O formato válido é YYYY-MM-DD'
        })
      if (moment(activeUntil, 'YYYY-MM-DD').diff(moment().format('YYYY-MM-DD')) < 0)
        return res.status(400).send({
          error: 'A data active_until não pode ser anterior a data de hoje, somente igual ou posterior'
        })

      if (!mongoIdIsValid(templateId)) return res.status(400).send({ error: 'O ID do template é inválido' })

      const { companyRepository, templateRepository } = this._getInstanceRepositories(req.app)
      const newBusiness = this._getInstanceBusiness(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      const template = await templateRepository.getById(templateId, companyToken)
      if (!template) return res.status(400).send({ error: 'Template não identificado' })
      if (!template.active)
        return res.status(400).send({
          error: 'Este template foi desativado e não recebe mais dados.'
        })

      const businessList = await newBusiness.getByNameAndTemplateId(companyToken, req.body.name, templateId)
      if (businessList.length) return res.status(400).send({ error: `${req.body.name} já foi cadastrado` })

      const { businessId, invalids } = await newBusiness.createFromJson(
        companyToken,
        name,
        template.fields,
        templateId,
        data,
        activeUntil,
        company.prefix_index_elastic,
        req.body,
        true,
        createdBy,
        aggregateMode
      )
      if (businessId === null) return res.status(400).send({ error: invalids })

      if (invalids.length) return res.status(400).send({ businessId, invalids })
      return res.status(201).send({ businessId })
    } catch (e) {
      console.error('CREATE BUSINESS FROM JSON ==> ', e)
      return res.status(500).send({ error: e.message })
    }
  }

  async createSingleRegisterBusiness(req, res) {
    console.log('createSingleRegisterBusiness')
    req.assert('templateId', 'O ID do template é obrigatório').notEmpty()
    req.assert('data', 'Os dados são obrigatórios.').notEmpty()

    if (req.validationErrors()) {
      return res.status(400).send({ errors: req.validationErrors() })
    }

    if (req.body.aggregate_mode && !Object.values(AggregateModeType).includes(req.body.aggregate_mode)) {
      return res.status(400).send({
        errors: `O aggregate_mode pode ser ${Object.values(AggregateModeType).join(',')}`
      })
    }

    const { templateId, data } = req.body

    if (data.length > 1) return res.status(400).send({ error: 'É possível cadastrar apenas um registro.' })

    const companyToken = req.headers['token']

    let createdBy = 0
    if (req.body.created_by && !isNaN(req.body.created_by)) {
      createdBy = parseInt(req.body.created_by)
    }

    try {
      const activeUntil = req.body.active_until ? req.body.active_until : moment().add(1, 'days').format('YYYY-MM-DD')

      const aggregateMode = req.body.aggregate_mode ? req.body.aggregate_mode : AggregateModeType.INCREMENT

      if (moment(activeUntil, 'YYYY-MM-DD').format('YYYY-MM-DD') !== activeUntil)
        return res.status(400).send({
          error: 'A data active_until está com formato inválido. O formato válido é YYYY-MM-DD'
        })
      if (moment(activeUntil).diff(moment()) < 0)
        return res.status(400).send({
          error: 'A data active_until não pode ser anterior a data de hoje, somente posterior'
        })

      if (!mongoIdIsValid(templateId)) return res.status(400).send({ error: 'O ID do template é inválido' })

      const { companyRepository, templateRepository } = this._getInstanceRepositories(req.app)
      const newBusiness = this._getInstanceBusiness(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      const template = await templateRepository.getById(templateId, companyToken)
      if (!template) return res.status(400).send({ error: 'Template não identificado' })
      if (!template.active)
        return res.status(400).send({
          error: 'Este template foi desativado e não recebe mais dados.'
        })

      const rndNumber = Math.floor(Math.random() * 10 + 1)
      const businessName = `single-register-${moment().format('YYYYMMDDHmmss')}${rndNumber}`

      const isBatch = false

      const { businessId, invalids, contactIds, valids } = await newBusiness.createSingleFromJson(
        companyToken,
        businessName,
        template.fields,
        templateId,
        data,
        activeUntil,
        company.prefix_index_elastic,
        req.body,
        isBatch,
        createdBy,
        aggregateMode
      )

      let dataInvalids = []
      if (invalids.length) dataInvalids = invalids[0].errors
      if (businessId === null) return res.status(400).send({ error: dataInvalids })

      if (dataInvalids.length) return res.status(400).send({ businessId, isBatch, invalids: dataInvalids })

      const crmIds = {
        templateId,
        businessId,
        registerId: valids[0]._id
      }

      return res.status(201).send({ businessId, isBatch, customerId: contactIds, crmIds })
    } catch (e) {
      console.error('CREATE BUSINESS FROM JSON ==> ', e)
      return res.status(500).send({ error: e.message })
    }
  }

  async getPoolData(req, res) {
    const fields = ['_id']

    const companyToken = req.headers['token']

    if (!companyToken) return res.status(400).send({ error: 'O token da company é obrigatório.' })

    const searchData = req.body.data
    if (!Array.isArray(searchData)) return res.status(400).send({ error: 'O data é um array obrigatório.' })
    else if (searchData.length === 0) return res.status(400).send({ error: 'O data deve ter no mínimo um item.' })

    if (!req.body['fields'] || req.body.fields.length === 0)
      return res.status(400).send({
        error: 'Indique no mínimo um campo para ser retornado no item fields.'
      })
    else if (!Array.isArray(req.body.fields)) return res.status(400).send({ error: 'O fields é um array de preenchimento obrigatório.' })

    try {
      const { companyRepository, businessRepository, templateRepository } = this._getInstanceRepositories(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      let searchDataInvalid = 0
      for (const i in searchData) {
        const data = searchData[i]
        if (!data['schama']) searchDataInvalid += 1
        else if (!data['lote_id']) searchDataInvalid += 1
        else if (!data['item_id']) searchDataInvalid += 1
      }

      if (searchDataInvalid) return res.status(400).send({ error: "Os itens no campo 'data' não estão corretos." })

      if (req.body.fields.indexOf('*') >= 0) {
        const listTemplateId = searchData.map((sd) => sd['schama'])
        const templateList = await templateRepository.getByListId(listTemplateId, companyToken)
        const visibleFieldList = []
        for (const i in templateList) {
          const template = templateList[i]
          const vfieldList = template.fields.filter((f) => f.visible).map((f) => f.column)
          visibleFieldList.push(...vfieldList)
        }
        fields.push(...visibleFieldList)
      } else {
        fields.push(...req.body.fields)
      }

      const businessData = await businessRepository.getDataByListId(companyToken, searchData, fields)

      return res.status(200).send(businessData)
    } catch (err) {
      console.error(err)
      return res.status(500).send({ error: err.message })
    }
  }

  async getAll(req, res) {
    const page = 0
    const limit = 20
    const companyToken = req.headers['token']

    try {
      const { companyRepository } = this._getInstanceRepositories(req.app)
      const newBusiness = this._getInstanceBusiness(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      const { businessList, pagination } = await newBusiness.getAllBatchesBasicPaginated(companyToken, 0, 10)
      const business = businessList.map((b) => {
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
          templateId: b.templateId
        }
      })

      return res.status(200).send(business)
    } catch (e) {
      return res.status(500).send({ error: e.message })
    }
  }

  async getAllActivated(req, res) {
    const companyToken = req.headers['token']

    try {
      const { companyRepository } = this._getInstanceRepositories(req.app)
      const newBusiness = this._getInstanceBusiness(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      const businessList = await newBusiness.getActivatedBatchesBasic(companyToken)
      const business = businessList.map((b) => {
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
          templateId: b.templateId
        }
      })

      return res.status(200).send(business)
    } catch (e) {
      return res.status(500).send({ error: e.message })
    }
  }

  async getAllPaginated(req, res) {
    const companyToken = req.headers['token']
    let page = 0
    let limit = 10

    if (req.query.page && parseInt(req.query.page) >= 0) page = parseInt(req.query.page)
    if (req.query.limit && parseInt(req.query.limit) >= 0) limit = parseInt(req.query.limit)

    try {
      const { companyRepository } = this._getInstanceRepositories(req.app)
      const newBusiness = this._getInstanceBusiness(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      const { businessList, pagination } = await newBusiness.getAllBatchesBasicPaginated(companyToken, page, limit)
      const business = { data: [], pagination }
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
          templateId: b.templateId
        }
      })

      return res.status(200).send(business)
    } catch (e) {
      console.error(e)
      return res.status(500).send({ error: e.message })
    }
  }

  async getAllActivatedPaginated(req, res) {
    const companyToken = req.headers['token']
    let page = 0
    let limit = 10

    if (req.query.page && parseInt(req.query.page) >= 0) page = parseInt(req.query.page)
    if (req.query.limit && parseInt(req.query.limit) >= 0) limit = parseInt(req.query.limit)

    try {
      const { companyRepository } = this._getInstanceRepositories(req.app)
      const newBusiness = this._getInstanceBusiness(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      const { businessList, pagination } = await newBusiness.getActivatedBatchesBasicPaginated(companyToken, page, limit)
      const business = { data: [], pagination }
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
          templateId: b.templateId
        }
      })

      return res.status(200).send(business)
    } catch (e) {
      console.error(e)
      return res.status(500).send({ error: e.message })
    }
  }

  async getAllInactivatedPaginated(req, res) {
    const companyToken = req.headers['token']
    let page = 0
    let limit = 10

    if (req.query.page && parseInt(req.query.page) >= 0) page = parseInt(req.query.page)
    if (req.query.limit && parseInt(req.query.limit) >= 0) limit = parseInt(req.query.limit)

    try {
      const { companyRepository } = this._getInstanceRepositories(req.app)
      const newBusiness = this._getInstanceBusiness(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      const { businessList, pagination } = await newBusiness.getInactivatedBatchesBasicPaginated(companyToken, page, limit)
      const business = { data: [], pagination }
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
          templateId: b.templateId
        }
      })

      return res.status(200).send(business)
    } catch (e) {
      console.error(e)
      return res.status(500).send({ error: e.message })
    }
  }

  async markBusinessFlowPassed(req, res) {
    const companyToken = req.headers['token']

    const businessId = req.params.id
    if (!mongoIdIsValid(businessId)) return res.status(500).send({ error: 'Código do lote inválido' })

    let updatedBy = 0
    if (req.body.updated_by && !isNaN(req.body.updated_by)) {
      updatedBy = parseInt(req.body.updated_by)
    }

    try {
      const { companyRepository, businessRepository } = this._getInstanceRepositories(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      const business = await businessRepository.getById(companyToken, businessId)
      if (!business) return res.status(400).send({ error: 'Business não identificado' })

      await businessRepository.markFlowPassed(companyToken, businessId, updatedBy)

      return res.sendStatus(200)
    } catch (e) {
      return res.status(500).send({ error: e.message })
    }
  }

  async unmarkBusinessFlowPassed(req, res) {
    const companyToken = req.headers['token']

    const businessId = req.params.id
    if (!mongoIdIsValid(businessId)) return res.status(500).send({ error: 'Código do lote inválido' })

    let updatedBy = 0
    if (req.body.updated_by && !isNaN(req.body.updated_by)) {
      updatedBy = parseInt(req.body.updated_by)
    }

    try {
      const { companyRepository, businessRepository } = this._getInstanceRepositories(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      const business = await businessRepository.getById(companyToken, businessId)
      if (!business) return res.status(400).send({ error: 'Business não identificado' })

      await businessRepository.unmarkFlowPassed(companyToken, businessId, updatedBy)

      return res.sendStatus(200)
    } catch (e) {
      return res.status(500).send({ error: e.message })
    }
  }

  async activateBusiness(req, res) {
    req.assert('active_until', 'O active until deve ser informado').notEmpty()

    if (req.validationErrors()) return res.status(400).send({ errors: req.validationErrors() })

    const companyToken = req.headers['token']

    const businessId = req.params.id
    if (!mongoIdIsValid(businessId)) return res.status(500).send({ error: 'Código do lote inválido' })

    try {
      const activeUntil = req.body.active_until
      let updatedBy = 0
      if (req.body.updated_by && !isNaN(req.body.updated_by)) {
        updatedBy = parseInt(req.body.updated_by)
      }
      const { companyRepository, businessRepository } = this._getInstanceRepositories(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      if (moment(activeUntil, 'YYYY-MM-DD').format('YYYY-MM-DD') !== activeUntil)
        return res.status(400).send({
          error: 'A data active_until está com formato inválido. O formato válido é YYYY-MM-DD'
        })
      if (moment(activeUntil, 'YYYY-MM-DD').diff(moment().format('YYYY-MM-DD')) < 0)
        return res.status(400).send({
          error: 'A data active_until não pode ser anterior a data de hoje, somente igual ou posterior'
        })

      const business = await businessRepository.getById(companyToken, businessId)
      if (!business) return res.status(400).send({ error: 'Business não identificado' })

      await businessRepository.activate(companyToken, businessId, activeUntil, updatedBy)

      return res.sendStatus(200)
    } catch (e) {
      return res.status(500).send({ error: e.message })
    }
  }

  async deactivateBusiness(req, res) {
    const companyToken = req.headers['token']

    const businessId = req.params.id
    if (!mongoIdIsValid(businessId)) return res.status(500).send({ error: 'Código do lote inválido' })

    let updatedBy = 0
    if (req.body.updated_by && !isNaN(req.body.updated_by)) {
      updatedBy = parseInt(req.body.updated_by)
    }

    try {
      const { companyRepository, businessRepository } = this._getInstanceRepositories(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      const business = await businessRepository.getById(companyToken, businessId)
      if (!business) return res.status(400).send({ error: 'Business não identificado' })

      await businessRepository.deactivate(companyToken, businessId, updatedBy)

      return res.sendStatus(200)
    } catch (e) {
      return res.status(500).send({ error: e.message })
    }
  }

  async searchDataInBusiness(req, res) {
    const companyToken = req.headers['token']

    const templateId = req.body.template_id

    if (!templateId) return res.status(400).send({ error: 'Informe o ID do template' })

    try {
      const { companyRepository, businessRepository, templateRepository } = this._getInstanceRepositories(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      const template = await templateRepository.getById(templateId, companyToken)
      if (!template) return res.status(400).send({ error: 'Template não identificado' })

      const allowedColumnType = ['string', 'text', 'cpfcnpj', 'email', 'phone_number', 'cep']
      const keyColumnList = template.fields.filter((f) => allowedColumnType.includes(f.type)).map((f) => f.column)

      const searchParams = req.body.search_params
      let searchParamsValues = []
      if (typeof searchParams === 'object' && !Array.isArray(searchParams)) {
        searchParamsValues = [String(searchParams.value)]
      } else {
        searchParamsValues = searchParams.map((sp) => String(sp.value))
      }

      const templateData = await businessRepository.listAllAndChildsByTemplateAndKeySortedReverse(
        companyToken,
        templateId,
        keyColumnList,
        searchParamsValues[0]
      )

      return res.status(200).send(templateData)
    } catch (e) {
      console.error(e)
      return res.status(500).send({ error: 'Ocorreu um erro ao pesquisar os clientes.' })
    }
  }

  async getByIdWithData(req, res) {
    const companyToken = req.headers['token']
    const businessId = req.params.id

    try {
      const { companyRepository } = this._getInstanceRepositories(req.app)
      const newBusiness = this._getInstanceBusiness(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      const business = await newBusiness.getDataById(companyToken, businessId)

      delete business.childBatchesId

      return res.status(200).send(business)
    } catch (e) {
      return res.status(500).send({ error: e.message })
    }
  }

  async getByIdWithDataPaginated(req, res) {
    const companyToken = req.headers['token']
    let page = 0
    let limit = 10
    if (req.query.page && parseInt(req.query.page) >= 0) page = parseInt(req.query.page)
    if (req.query.limit && parseInt(req.query.limit) >= 0) limit = parseInt(req.query.limit)

    const businessId = req.params.id
    if (!businessId) return res.status(400).send({ error: 'O ID do business é obrigatório.' })

    try {
      const { companyRepository } = this._getInstanceRepositories(req.app)
      const newBusiness = this._getInstanceBusiness(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      const business = await newBusiness.getDataByIdPaginated(companyToken, businessId, page, limit)

      return res.status(200).send(business)
    } catch (e) {
      console.error(e)
      return res.status(500).send({ error: 'Ocorreu erro ao listar os dados paginados' })
    }
  }

  async deactivateExpiredBusiness() {
    console.log('deactivateExpiredBusinessV2')
    const app = { locals: { db: null } }
    const { connect } = require('../../config/mongodb')
    await new Promise((resolve, reject) => {
      connect(app, () => {
        resolve()
      })
    })
    try {
      const { businessRepository } = this._getInstanceRepositories(app)
      const currentDate = moment().format('YYYY-MM-DD')
      const businessList = await businessRepository.getExpiredBusiness(currentDate)

      businessList.forEach(async (b) => {
        const businessId = b._id
        const companyToken = b.companyToken
        businessRepository
          .deactivate(companyToken, businessId)
          .then(() => {
            console.log('Mailing', businessId, 'on company', companyToken, 'disabled by expiration')
          })
          .catch((err) => {
            console.error('Error on disable mailing by expiration. Mailing', businessId, 'on company', companyToken)
          })
      })

      return true
    } catch (err) {
      console.error(err)
      return true
    }
  }

  async updateBusinessRegisterById(req, res) {
    const companyToken = req.headers['token']
    const templateId = req.headers['templateid']

    if (!templateId) return res.status(400).send({ error: 'Informar o ID do tempolate no header' })

    const registerId = req.params.registerId
    if (!registerId) return res.status(400).send({ error: 'Informar o ID do registro que deseja alterar.' })

    const businessId = req.params.businessId
    if (!businessId) return res.status(400).send({ error: 'Informar o ID do lote que deseja alterar.' })

    const dataUpdate = req.body

    let updatedBy = 0
    if (req.body.updated_by && !isNaN(req.body.updated_by)) {
      updatedBy = parseInt(req.body.updated_by)
    }

    try {
      const { companyRepository, templateRepository, businessRepository } = this._getInstanceRepositories(req.app)
      const newBusiness = this._getInstanceBusiness(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      const template = await templateRepository.getById(templateId, companyToken)
      if (!template) return res.status(400).send({ error: 'Template não identificado' })

      let fieldEditableList = template.fields.filter((f) => f.editable)
      if (!Array.isArray(fieldEditableList)) fieldEditableList = []

      if (fieldEditableList.length === 0) return res.status(400).send({ error: 'Este template não possui campos editáveis' })

      const businessList = await businessRepository.getDataByIdAndChildReference(companyToken, businessId)
      if (!businessList) return res.status(400).send({ error: 'Business não identificado.' })

      const register = await businessRepository.getRegisterByBusinessAndId(companyToken, businessId, registerId)
      if (!register) return res.status(404).send({ error: 'Registro não encontrado' })

      fieldEditableList.forEach((f) => {
        if (dataUpdate[f.column] && String(dataUpdate[f.column]).length > 0) {
          if ((f.type === 'array' || f.type === 'options') && !Array.isArray(dataUpdate[f.column])) {
            register[f.column] = [dataUpdate[f.column]]
          } else {
            register[f.column] = dataUpdate[f.column]
          }

          register.businessUpdatedAt = moment().format()
        }
      })

      const objCRM = {}
      template.fields.forEach((data) => {
        Object.keys(register).forEach((keysRegister) => {
          if (keysRegister === data.column) objCRM[data.data] = JSON.parse(JSON.stringify(register[data.column]))
        })
        if (Array.isArray(data.fields)) {
          data.fields.forEach((dataFields) => {
            if (Array.isArray(objCRM[data.data])) {
              objCRM[data.data].forEach((dataObjCRM) => {
                Object.keys(dataObjCRM).forEach((keysDataObjCRM) => {
                  if (keysDataObjCRM === dataFields.column) {
                    dataObjCRM[dataFields.data] = dataObjCRM[dataFields.column]
                    delete dataObjCRM[dataFields.column]
                  }
                })
              })
            }
          })
        }
      })

      if (dataUpdate.idCrm) {
        await newBusiness.updateDataBusiness(businessId, register, updatedBy)
        const searchCustomerCRM = await crmService.getCustomerById(dataUpdate.idCrm, companyToken)

        if (!searchCustomerCRM.data) return res.status(500).send({ error: 'Os dados não foram atualizados corretamente.' })
        await crmService.updateCustomer(searchCustomerCRM.data.id, objCRM, companyToken)
      }

      return res.status(200).send(register)
    } catch (err) {
      console.error(err)
      return res.status(500).send({ error: 'Ocorreu erro ao atualizar o registro' })
    }
  }

  async getBusinessRegisterById(req, res) {
    const companyToken = req.headers['token']
    const templateId = req.headers['templateid']
    const businessId = req.params.businessId
    const registerId = req.params.registerId
    const cacheKey = `${templateId}:${businessId}:${registerId}`

    try {
      const { companyRepository, templateRepository } = this._getInstanceRepositories(req.app)
      const newBusiness = this._getInstanceBusiness(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      const template = await templateRepository.getById(templateId, companyToken)
      if (!template) return res.status(400).send({ error: 'Template não identificado' })

      if (global.cache.business_data[cacheKey]) {
        const registerCached = global.cache.business_data[cacheKey]
        if (registerCached && registerCached.expire && calcExpireTime(new Date(), registerCached.expire) < global.cache.default_expire) {
          console.log('BUSINESS_REGISTER_CACHED')
          return res.status(200).send(registerCached.data)
        } else {
          global.cache.business_data[cacheKey] = null
        }
      }

      const business = await newBusiness.getRegisterById(companyToken, businessId, registerId)
      if (!business) return res.status(400).send({ error: 'Registro não encontrado.' })

      console.log('BUSINESS_REGISTER_STORED')
      global.cache.business_data[cacheKey] = {
        data: business,
        expire: new Date()
      }

      return res.status(200).send(business)
    } catch (err) {
      console.error(err)
      return res.status(500).send({ error: err.message })
    }
  }

  async getBusinessAndRegisterIdByCpf(req, res) {
    const companyToken = req.headers['token']
    const templateId = req.headers['templateid']

    if (!req.query['cpfcnpj']) return res.status(400).send({ error: 'É obrigatório informar o CPF/CNPJ.' })

    try {
      const querySearch = req.query.cpfcnpj

      const { companyRepository, templateRepository, businessRepository } = this._getInstanceRepositories(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      const template = await templateRepository.getById(templateId, companyToken)
      if (!template) return res.status(400).send({ error: 'Template não identificado' })

      const fieldCPFCNPJ = template.fields.find((f) => f.data === 'customer_cpfcnpj')

      const keyCPFCNPJ = fieldCPFCNPJ.column

      const response = await businessRepository.listAllAndChildsByTemplateAndKeySortedReverse(
        companyToken,
        templateId,
        [keyCPFCNPJ],
        querySearch
      )

      if (!response || response.length === 0) return res.status(404).send([])

      return res.status(200).send(response)
    } catch (err) {
      console.error(err)
      return res.status(500).send({ error: err.message })
    }
  }
}
