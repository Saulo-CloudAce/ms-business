import moment from 'moment'
import fs from 'fs'

import Business from '../../domain-v2/business.js'
import BusinessRepository from '../repository/business-repository.js'
import CompanyRepository from '../repository/company-repository.js'
import TemplateRepository from '../repository/template-repository.js'
import Uploader from '../lib/uploader.js'
import Validator from '../lib/validator.js'
import * as crmService from '../services/crm-service.js'
import { mongoIdIsValid } from '../helpers/validators.js'
import { AggregateModeType } from '../../domain-v2/aggregate-mode-enum.js'
import CacheService from '../services/cache-service.js'
import { connect } from '../../config/mongodb.js'
import { generateExcel } from '../helpers/excel-generator.js'
import { sendEmail, sendEmailBussinessError } from '../helpers/email-sender.js'
import Redis from '../../config/redis.js'
import { clearFilename } from '../helpers/formatters.js'
import { getGeolocationDataFromCEPs } from '../helpers/geolocation-getter.js'
import { sendToQueuePostProcess } from '../helpers/rabbit-helper.js'
import { isTypeCepDistance, isTypeOptIn, isTypeRegisterActive } from '../helpers/field-methods.js'
import QueryPredicate from '../repository/query-predicate.js'

export default class BusinessController {
  constructor(businessService = {}) {
    this.businessService = businessService
    this.uploader = new Uploader(process.env.BUCKET)
  }

  _getInstanceRepositories(app) {
    const cacheService = new CacheService(app.locals.redis)

    const businessRepository = new BusinessRepository(app.locals.db, cacheService)
    const companyRepository = new CompanyRepository(app.locals.db)
    const templateRepository = new TemplateRepository(app.locals.db, cacheService)

    return { businessRepository, companyRepository, templateRepository }
  }

  _getInstanceBusiness(app) {
    const { businessRepository } = this._getInstanceRepositories(app)
    return new Business(businessRepository, this.uploader, new Validator(), crmService)
  }

  async createFromUrlFile(req, res) {
    console.log('createFromUrlFile')

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

      const template = await templateRepository.getByIdWithoutTags(templateId, companyToken)
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
      console.error(e)
      return res.status(500).send({ error: `Ocorreu erro ao importar o mailing` })
    }
  }

  async create(req, res) {
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

      const template = await templateRepository.getByIdWithoutTags(templateId, companyToken)
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
      return res.status(500).send({ error: 'Ocorreu erro ao importar o mailing por upload de arquivo' })
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

      const template = await templateRepository.getByIdWithoutTags(templateId, companyToken)
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
      return res.status(500).send({ error: 'Ocorreu erro ao importar o mailing via API' })
    }
  }

  async createSingleRegisterBusiness(req, res) {
    console.log('createSingleRegisterBusiness')

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

      const template = await templateRepository.getByIdWithoutTags(templateId, companyToken)
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
      return res.status(500).send({ error: 'Ocorreu erro ao criar o registro' })
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
      return res.status(500).send({ error: 'Ocorreu erro ao buscar um pool de dados' })
    }
  }

  async getAll(req, res) {
    const page = 0
    const limit = 100
    const companyToken = req.headers['token']

    try {
      const { companyRepository } = this._getInstanceRepositories(req.app)
      const newBusiness = this._getInstanceBusiness(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      const { businessList, pagination } = await newBusiness.getAllBatchesBasicPaginated(companyToken, page, limit)
      const business = businessList.map((b) => {
        return {
          _id: b._id,
          name: b.name,
          activeUntil: b.activeUntil,
          active: b.active,
          createdAt: b.createdAt,
          updatedAt: b.updatedAt,
          createdBy: b.createdBy ? b.createdBy : 0,
          updatedBy: b.updatedBy ? b.updatedBy : 0,
          templateId: b.templateId
        }
      })

      return res.status(200).send(business)
    } catch (e) {
      console.error(e)
      return res.status(500).send({ error: 'Ocorreu erro ao listar todos mailings' })
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
          templateId: b.templateId,
          flowPassed: b.flow_passed || b.flowPassed ? true : false
        }
      })

      return res.status(200).send(business)
    } catch (e) {
      console.error(e)
      return res.status(500).send({ error: 'Ocorreu erro ao listar todos mailings ativos' })
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
          flowPassed: b.flow_passed || b.flowPassed ? true : false,
          templateId: b.templateId
        }
      })

      return res.status(200).send(business)
    } catch (e) {
      console.error(e)
      return res.status(500).send({ error: 'Ocorreu erro ao listar todos mailings de forma paginada' })
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
          templateId: b.templateId,
          flowPassed: b.flow_passed || b.flowPassed ? true : false
        }
      })

      return res.status(200).send(business)
    } catch (e) {
      console.error(e)
      return res.status(500).send({ error: 'Ocorreu erro ao listar mailings ativos de forma pagindada' })
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
          templateId: b.templateId,
          flowPassed: b.flow_passed || b.flowPassed ? true : false
        }
      })

      return res.status(200).send(business)
    } catch (e) {
      console.error(e)
      return res.status(500).send({ error: 'Ocorreu erro ao listar mailings inativos de forma paginada' })
    }
  }

  async activateBusiness(req, res) {
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
      console.error(e)
      return res.status(500).send({ error: 'Ocorreu erro ao ativar o mailing' })
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
      console.error(e)
      return res.status(500).send({ error: 'Ocorreu erro ao desativar o mailing' })
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

      const template = await templateRepository.getByIdWithoutTags(templateId, companyToken)
      if (!template) return res.status(400).send({ error: 'Template não identificado' })

      const allowedColumnType = ['string', 'text', 'cpfcnpj', 'email', 'phone_number', 'cep', 'array']
      const keyColumnList = []
      const fieldsAllowed = template.fields.filter((f) => allowedColumnType.includes(f.type))

      fieldsAllowed.forEach((f) => {
        if (f.type === 'array') {
          keyColumnList.push(...this._serializeColumn(f.column, f))
        } else {
          keyColumnList.push(f.column)
        }
      })

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

  _serializeColumn(prefix = '', field = {}) {
    const columns = []
    if (field.type !== 'array') {
      columns.push(`${prefix}.${field.column}`)
      return columns
    }

    for (let i = 0; i < field.fields.length; i++) {
      const f = field.fields[i]
      const subcolumns = []
      if (f.type === 'array') {
        const columnsArray = this._serializeColumn(`${prefix}.${f.column}`, f)
        subcolumns.push(...columnsArray)
      } else {
        subcolumns.push(`${prefix}.${f.column}`)
      }
      columns.push(...subcolumns)
    }

    return columns
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
      console.error(e)
      return res.status(500).send({ error: 'Ocorreu erro ao buscar o mailing com os dados' })
    }
  }

  async getInfoById(req, res) {
    const companyToken = req.headers['token']
    const businessId = req.params.id

    try {
      const { companyRepository } = this._getInstanceRepositories(req.app)
      const newBusiness = this._getInstanceBusiness(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      const business = await newBusiness.getInfoById(companyToken, businessId)

      delete business.childBatchesId
      delete business.invalids

      return res.status(200).send(business)
    } catch (e) {
      console.error(e)
      return res.status(500).send({ error: 'Ocorreu erro ao buscar o mailing com os dados' })
    }
  }

  async exportErrorsBusinessById(req, res) {
    const companyToken = req.headers['token']
    const businessId = req.params.id

    const email = req.query.email
    if (!email) {
      return res.status(400).send({
        error: 'Informe um e-mail para enviar o arquivo com os dados'
      })
    }

    try {
      const { companyRepository } = this._getInstanceRepositories(req.app)
      const newBusiness = this._getInstanceBusiness(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      const business = await newBusiness.getInvalidsFromBusinessById(companyToken, businessId)
      await this._exportSheetBusinessErrors(business, email)

      return res
        .status(200)
        .send({ warn: `Em instantes será enviado um e-mail para ${email} contendo uma planilha com o resultado da busca.` })
    } catch (e) {
      console.error(e)
      return res.status(500).send({ error: 'Ocorreu erro ao buscar o mailing com os dados' })
    }
  }

  async _exportSheetBusinessErrors(business = {}, email = '') {
    const errorsByLine = await this._indexErrorsByLine(business.invalids)
    const errors = this._flatErrorsIndexed(Object.values(errorsByLine))
    await this._generateSheetBusinessErrors(business, errors, email)
  }

  async _generateSheetBusinessErrors(business = {}, errors = [], email = '') {
    const header = [
      { key: 'line', header: 'Linha' },
      { key: 'column', header: 'Campo' },
      { key: 'error', header: 'Erro' },
      { key: 'current_value', header: 'Valor enviado' }
    ]

    const filename = `${business.name}_errors.xlsx`
    const filepath = `/tmp/${filename}`

    generateExcel(header, errors, filepath).then(
      setTimeout(() => {
        const result = sendEmailBussinessError(email, filepath, filename)
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
  }

  _flatErrorsIndexed(errorsByLine = []) {
    const errors = []
    for (let i = 0; i < errorsByLine.length; i++) {
      errors.push(...errorsByLine[i])
    }

    return errors
  }

  async _indexErrorsByLine(lines = {}) {
    const indexed = {}
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNumber = line.line
      const errors = line.errors
      if (!indexed[lineNumber]) {
        indexed[lineNumber] = []
      }

      indexed[lineNumber].push(...this._formatLineErrors(lineNumber, errors))
    }

    return indexed
  }

  _formatLineErrors(lineNumber = 0, errors = {}) {
    const lines = []
    for (let i = 0; i < errors.length; i++) {
      const error = errors[i]
      const lineError = { line: lineNumber, column: error.column, error: error.error, current_value: error.current_value }
      lines.push(lineError)
    }

    return lines
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

  async getByIdWithDataPaginatedAndFieldsSelected(req, res) {
    const companyToken = req.headers['token']
    let page = 0
    let limit = 10
    if (req.query.page && parseInt(req.query.page) >= 0) page = parseInt(req.query.page)
    if (req.query.limit && parseInt(req.query.limit) >= 0) limit = parseInt(req.query.limit)

    const businessId = req.params.id
    if (!businessId) return res.status(400).send({ error: 'O ID do business é obrigatório.' })

    let fieldsSelected = []
    if (req.body.fields) {
      fieldsSelected = req.body.fields
    }

    let filterBy = req.body.filter_rules ? req.body.filter_rules : []

    try {
      const { companyRepository, templateRepository } = this._getInstanceRepositories(req.app)
      const newBusiness = this._getInstanceBusiness(req.app)


      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      const businessInfo = await newBusiness.getInfoById(companyToken, businessId)

      const template = await templateRepository.getByIdWithoutTags(businessInfo.templateId, companyToken)

      filterBy = this._parseQueryPredicate(filterBy)
      console.log(JSON.stringify(filterBy))

      const queryPredicate = new QueryPredicate(filterBy, template)

      const business = await newBusiness.getDataByIdPaginatedAndFieldsSelected(companyToken, businessId, fieldsSelected, queryPredicate, page, limit)

      return res.status(200).send(business)
    } catch (e) {
      console.error(e)
      return res.status(500).send({ error: 'Ocorreu erro ao listar os dados paginados' })
    }
  }

  _parseQueryPredicate(filters = []) {
    for (let i = 0; i < filters.length; i++) {
      if (filters[i].key) {
        filters[i].field = filters[i].key
        delete filters[i].key
      } else {
        filters[i].rules = this._parseQueryPredicate(filters[i].rules)
      }
    }

    return filters
  }

  async deactivateExpiredBusiness() {
    console.log('deactivateExpiredBusinessV2')
    const app = { locals: { db: null, redis: Redis.newConnection() } }
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
      delete dataUpdate.updated_by
    }

    try {
      const { companyRepository, templateRepository, businessRepository } = this._getInstanceRepositories(req.app)
      const newBusiness = this._getInstanceBusiness(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      const template = await templateRepository.getByIdWithoutTags(templateId, companyToken)
      if (!template) return res.status(400).send({ error: 'Template não identificado' })

      const fieldEditableMap = this._getMapFieldsEditables(template.fields)

      if (Object.keys(fieldEditableMap).length === 0) return res.status(400).send({ error: 'Este template não possui campos editáveis' })

      const businessList = await businessRepository.getDataByIdAndChildReference(companyToken, businessId)
      if (!businessList) return res.status(400).send({ error: 'Business não identificado.' })

      let register = await businessRepository.getRegisterByBusinessAndId(companyToken, businessId, registerId)
      if (!register) return res.status(404).send({ error: 'Registro não encontrado' })

      const fieldEditableList = Object.values(fieldEditableMap)
      register = this._updateDataRegister(register, dataUpdate, fieldEditableList)

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

      await newBusiness.updateDataBusiness(companyToken, businessId, register, updatedBy)
      if (this._templateHasCepDistanceField(template.fields)) {
        const obj = {
          templateId,
          businessId,
          companyToken,
          data: register
        }
        sendToQueuePostProcess(obj)
      }

      if (dataUpdate.idCrm) {
        const searchCustomerCRM = await crmService.getCustomerById(dataUpdate.idCrm, companyToken)

        if (!searchCustomerCRM.data) return res.status(500).send({ error: 'Os dados não foram atualizados corretamente.' })
        await crmService.updateCustomer(searchCustomerCRM.data.id, objCRM, companyToken)
      }

      register = await businessRepository.getRegisterByBusinessAndId(companyToken, businessId, registerId)

      return res.status(200).send(register)
    } catch (err) {
      console.error(err)
      return res.status(500).send({ error: 'Ocorreu erro ao atualizar o registro' })
    }
  }

  _templateHasCepDistanceField(fields = []) {
    for (let f of fields) {
      if (isTypeCepDistance(f)) {
        return true
      } else if (f.fields && Array.isArray(f.fields)) {
        return this._templateHasCepDistanceField(f.fields)
      }
    }

    return false
  }

  _checkIfFieldIsEditable(field = {}, editables = []) {
    if (field.editable) {
      editables.push(field)
    } else if (field.type === 'array' && field.fields && field.fields.length) {
      for (const f of field.fields) {
        editables = this._checkIfFieldIsEditable(f, editables)
      }
    }
    return editables
  }

  _getMapFieldsEditables(fields = []) {
    let editables = []
    for (const field of fields) {
      editables = this._checkIfFieldIsEditable(field, editables)
    }

    const indexed = {}
    for (let field of editables) {
      indexed[field.column] = field
    }

    return indexed
  }

  _getFieldEditedButNotEditable(dataUpdate = {}, fieldEditableMap = {}) {
    const fields = []
    const columns = Object.keys(dataUpdate).filter((k) => k !== 'idCrm')
    for (const column of columns) {
      if (!fieldEditableMap[column]) {
        fields.push(column)
      }
    }

    return fields
  }

  _updateDataRegister(register = {}, dataUpdate = {}, fieldsEditables = []) {
    for (const f of fieldsEditables) {
      if (dataUpdate[f.column] != undefined && String(dataUpdate[f.column]).length > 0) {
        if ((f.type === 'array' || f.type === 'options') && !Array.isArray(dataUpdate[f.column])) {
          register[f.column] = [dataUpdate[f.column]]
        } else if (isTypeCepDistance(f)) {
          register[f.column] = {
            value: dataUpdate[f.column],
            coordinates: {
              lat_source: 0,
              long_source: 0,
              lat_target: 0,
              long_target: 0,
              distance_in_km: 0
            }
          }
        } else if (isTypeRegisterActive(f)) {
          register[f.column] = { value: dataUpdate[f.column], updated_at: moment().format() }
        } else if (isTypeOptIn(f)) {
          register[f.column] = { value: dataUpdate[f.column], updated_at: moment().format() }
        } else {
          register[f.column] = dataUpdate[f.column]
        }

        register.businessUpdatedAt = moment().format()
      }
    }

    return register
  }

  async getBusinessRegisterById(req, res) {
    const companyToken = req.headers['token']
    const templateId = req.headers['templateid']
    const businessId = req.params.businessId
    const registerId = req.params.registerId

    try {
      const { companyRepository, templateRepository } = this._getInstanceRepositories(req.app)
      const newBusiness = this._getInstanceBusiness(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      const template = await templateRepository.getByIdWithoutTags(templateId, companyToken)
      if (!template) return res.status(400).send({ error: 'Template não identificado' })

      const business = await newBusiness.getRegisterById(companyToken, businessId, registerId)
      if (!business) return res.status(400).send({ error: 'Registro não encontrado.' })

      return res.status(200).send(business)
    } catch (err) {
      console.error(err)
      return res.status(500).send({ error: 'Ocorreu erro ao buscar o registro' })
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

      const template = await templateRepository.getByIdWithoutTags(templateId, companyToken)
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
      return res.status(500).send({ error: 'Ocorreu erro ao buscar o registro do mailing pelo CPF/CNPJ' })
    }
  }

  async markBusinessFlowPassed(req, res) {
    const companyToken = req.headers['token']

    const businessId = req.params.id
    if (!mongoIdIsValid(businessId)) return res.status(500).send({ error: 'Código do lote inválido' })

    try {
      const { companyRepository, businessRepository } = this._getInstanceRepositories(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      const business = await businessRepository.getById(companyToken, businessId)
      if (!business) return res.status(400).send({ error: 'Business não identificado' })

      await businessRepository.markFlowPassed(companyToken, businessId)

      return res.sendStatus(200)
    } catch (e) {
      return res.status(500).send({ error: e.message })
    }
  }

  async unmarkBusinessFlowPassed(req, res) {
    const companyToken = req.headers['token']

    const businessId = req.params.id
    if (!mongoIdIsValid(businessId)) return res.status(500).send({ error: 'Código do lote inválido' })

    try {
      const { companyRepository, businessRepository } = this._getInstanceRepositories(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      const business = await businessRepository.getById(companyToken, businessId)
      if (!business) return res.status(400).send({ error: 'Business não identificado' })

      await businessRepository.unmarkFlowPassed(companyToken, businessId)

      return res.sendStatus(200)
    } catch (e) {
      return res.status(500).send({ error: e.message })
    }
  }

  async exportBusiness(req, res) {
    const companyToken = req.headers['token']
    const businessId = req.params.id
    const email = req.query.email
    if (!email) {
      return res.status(400).send({
        error: 'Informe um e-mail para enviar o arquivo com os dados'
      })
    }

    try {
      const { companyRepository, templateRepository } = this._getInstanceRepositories(req.app)
      const newBusiness = this._getInstanceBusiness(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      const business = await newBusiness.getDataByIdToExport(companyToken, businessId)

      if (!business) {
        return res.status(404).send({ error: 'Não foi encontrado um business com este ID' })
      }

      const template = await templateRepository.getByIdWithoutTags(business.templateId, companyToken)

      const businessData = this._formatDataToExport(business.data, template.fields)

      let templateFieldsIndexed = {}
      const allFieldsIndexed = {}
      for (let i = 0; i < template.fields.length; i++) {
        const field = template.fields[i]
        allFieldsIndexed[field.column] = field.label
      }

      const fields = template.fields.map((f) => f.column)

      for (let i = 0; i < fields.length; i++) {
        const f = fields[i]
        if (allFieldsIndexed[f]) {
          templateFieldsIndexed[f] = allFieldsIndexed[f]
        }
      }

      const header = Object.keys(businessData[0]).map((k) => {
        return { key: `${k}`, header: `${templateFieldsIndexed[k]}` }
      })

      const filename = `${clearFilename(business.name)}_exported_${moment().format('YYYYMMDDHHMMSS')}.xlsx`
      const filepath = `/tmp/${filename}`

      generateExcel(header, businessData, filepath).then(
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

      return res.status(200).send({ warn: `Em instantes será enviado um e-mail para ${email} contendo o mailing solicitado.` })
    } catch (err) {
      console.error(err)
      return res.status(500).send({ error: 'Ocorreu erro ao exportar os dados do business' })
    }
  }

  _formatDataToExport(data = [], fields = []) {
    data = this._formatDataFromFieldArray(data, fields)

    return data
  }

  _formatDataFromFieldArray(data = [], fields = []) {
    const fieldIndexed = {}
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i]
      if (f.fields) {
        fieldIndexed[f.column] = this._indexFieldArray(f.fields)
      }
    }

    for (let i = 0; i < data.length; i++) {
      let linha = data[i]
      linha = this._formatRowWithArray(linha, fieldIndexed)
    }

    return data
  }

  _indexFieldArray(fields = []) {
    const fieldIndexed = {}
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i]
      fieldIndexed[f.column] = f.label
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
          return `${label}: ${item[f]}`
        }

        return `${label}: -`
      })
      items.push(s.join(', '))
    }

    return items.join(' | ')
  }

  async queuePostProcess(conn = {}, app = {}) {
    const { templateRepository, businessRepository } = this._getInstanceRepositories(app)
    conn.createChannel((err, ch) => {
      if (err) console.log('Erro ao criar fila => ', err)

      const queueName = `msbusiness:post_process`

      ch.assertQueue(queueName, { durable: true })
      ch.prefetch(1)
      ch.consume(
        queueName,
        (msg) => {
          const obj = JSON.parse(msg.content.toString())
          this.processData(templateRepository, businessRepository, obj).then(() => {
            ch.ack(msg, false)
          })
        },
        { noAck: false }
      )
    })
  }

  async processData(templateRepository = {}, businessRepository = {}, obj = {}) {
    const template = await templateRepository.getByIdWithoutTags(obj.templateId, obj.companyToken)
    const cepDistancePathField = this._getPathFieldCepDistance(template.fields)
    const data = await businessRepository.getRegisterByBusinessAndId(obj.companyToken, obj.businessId, obj.data['_id'])
    const geoData = data[cepDistancePathField[0]]
    if (geoData && geoData.value) {
      const ceps = geoData.value.split(':')
      if (ceps.length === 2) {
        const geoDataResult = await getGeolocationDataFromCEPs(...ceps)
        if (!geoDataResult.error) {
          geoData.coordinates.lat_source = geoDataResult.lat_source
          geoData.coordinates.long_source = geoDataResult.long_source
          geoData.coordinates.lat_target = geoDataResult.lat_target
          geoData.coordinates.long_target = geoDataResult.long_target
          geoData.coordinates.distance_in_km = geoDataResult.distance_in_km
        } else {
          console.error(geoDataResult.error)
        }
        data[cepDistancePathField[0]] = geoData
      }
    }

    await businessRepository.updateAllRegisterBusiness(obj.companyToken, data['_id'], data)
  }

  _getPathFieldCepDistance(fields = []) {
    let path = []
    for (let f of fields) {
      if (f.type === 'cep_distance') {
        path.push(f.column)
        return path
      } else if (f.fields && Array.isArray(f.fields)) {
        const subpath = this._getPathFieldCepDistance(f.fields)
        path.push(...subpath)
      }
    }

    return path
  }
}
