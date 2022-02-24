import supertest from 'supertest'
import nock from 'nock'
import axios from 'axios'

import adapter from 'axios/lib/adapters/http'
axios.defaults.adapter = adapter

import UploaderMock from '../utils/uploader-mock.js'
import CRMServiceMock from '../utils/crm-service-mock.js'

import app from '../../config/server.js'
import { connect } from '../../config/mongodb.js'

import CompanyModel from '../../domain-v2/company.js'
import CompanyRepository from '../../src-v2/repository/company-repository.js'
import TemplateRepository from '../../src-v2/repository/template-repository.js'
import BusinessModel from '../../domain-v2/business.js'
import BusinessRepository from '../../src-v2/repository/business-repository.js'
import Validator from '../../src-v2/lib/validator.js'

let companyModel = ''
let companyRepository = ''
let templateRepository = ''
let businessModel = ''
let businessRepository = ''

const request = supertest(app)

let companyCreated = ''
let templateCreated = ''
let templateDocumentCreated = ''
let businessCreated = ''

const b = {
  name: 'lote 1',
  active_until: '2030-12-31',
  templateId: '',
  data: [
    { name: 'Pessoa 1', cpf_cnpj: '11122233344' },
    { name: 'Pessoa 2', cpf_cnpj: '21122233344' }
  ]
}

const businessDocument = {
  name: 'lote 1',
  active_until: '2030-12-31',
  templateId: '',
  data: [
    {
      name: 'Pessoa 1',
      cpf_cnpj: '11122233344',
      rg: { name: 'arq_rg.png', url: 'http://radioimprensa.com.br/wp-content/uploads/2019/08/rg-novo.jpg' }
    },
    {
      name: 'Pessoa 2',
      cpf_cnpj: '21122233344',
      rg: { name: 'arq_rg.png', url: 'http://radioimprensa.com.br/wp-content/uploads/2019/08/rg-novo.jpg' }
    }
  ]
}

const t = {
  name: 'template simples',
  fields: [
    {
      type: 'string',
      column: 'name',
      data: 'customer_name',
      label: 'Nome',
      key: false,
      operator_can_view: true,
      required: true,
      editable: true,
      visible: true
    },
    {
      type: 'cpfcnpj',
      column: 'cpf_cnpj',
      data: 'customer_cpfcnpj',
      label: 'CPF/CNPJ',
      key: true,
      operator_can_view: true,
      required: true,
      editable: false,
      visible: true
    }
  ],
  active: true
}

const templateDocument = {
  name: 'template document simples',
  fields: [
    {
      type: 'string',
      column: 'name',
      data: 'customer_name',
      label: 'Nome',
      key: false,
      operator_can_view: true,
      required: true,
      editable: true,
      visible: true
    },
    {
      type: 'cpfcnpj',
      column: 'cpf_cnpj',
      data: 'customer_cpfcnpj',
      label: 'CPF/CNPJ',
      key: true,
      operator_can_view: true,
      required: true,
      editable: false,
      visible: true
    },
    {
      type: 'document',
      column: 'rg',
      data: 'arquivo_rg',
      label: 'RG',
      key: false,
      operator_can_view: true,
      required: true,
      editable: false,
      visible: true,
      has_expiration: false
    }
  ],
  active: true
}

const c = {
  name: 'company-test-t',
  prefix_index_elastic: 'company-test-t',
  callback: 'http://localhost:5500/v1/crm-t'
}

async function createCompany() {
  return companyModel.create(c.name, c.prefix_index_elastic, c.callback)
}

async function createTemplate(companyToken = '', templateCreate = {}) {
  return templateRepository.save(templateCreate.name, templateCreate.fields, companyToken, templateCreate.active)
}

async function createBusiness(templateId = '', token = '') {
  b.name = 'lote0003'
  b.templateId = templateId

  return businessModel.createFromJson(token, b.name, t.fields, templateId, b.data, b.active_until, c.prefix_index_elastic, b, true)
}

describe('CRUD business', () => {
  beforeAll(async () => {
    await new Promise((resolve, reject) => {
      connect(app, async () => {
        await app.locals.db.collection('business').remove({})
        await app.locals.db.collection('business_data').remove({})

        companyRepository = new CompanyRepository(app.locals.db)
        companyModel = new CompanyModel(companyRepository)
        templateRepository = new TemplateRepository(app.locals.db)
        businessRepository = new BusinessRepository(app.locals.db)
        businessModel = new BusinessModel(businessRepository, new UploaderMock(), new Validator(), new CRMServiceMock())

        companyCreated = await createCompany()
        templateCreated = await createTemplate(companyCreated.token, t)
        templateDocumentCreated = await createTemplate(companyCreated.token, templateDocument)

        businessCreated = await createBusiness(`${templateCreated._id.toString()}`, companyCreated.token)

        resolve()
      })
    })
  })

  afterAll(() => {
    app.locals.conn.close()
  })

  it('Create a business from JSON', async (done) => {
    b.templateId = templateCreated._id
    b.name = 'lote0004'

    nock('http://localhost:4000', {
      reqheaders: {
        token: companyCreated.token
      }
    })
      .intercept('/api/v1/customers', 'OPTIONS')
      .reply(200)
      .post('/api/v1/customers')
      .reply(200, { contact_ids: 1 })

    request
      .post('/api/v2/business_json')
      .send(b)
      .set('Accept', 'application/json')
      .set('token', companyCreated.token)
      .end((err, res) => {
        if (err) done(err)

        expect(res.statusCode).toBe(201)

        expect(res.body).toHaveProperty('businessId')

        done()
      })
  })

  it('Create a single register', async (done) => {
    const b1 = b
    b1.templateId = templateCreated._id
    b1.name = 'Lote78912'
    b1.data = [b.data[0]]

    nock('http://localhost:4000', {
      reqheaders: {
        token: companyCreated.token
      }
    })
      .intercept('/api/v1/customers', 'OPTIONS')
      .reply(200)
      .post('/api/v1/customers')
      .reply(200, { contact_ids: 1 })

    request
      .post('/api/v2/business_single_register')
      .send(b1)
      .set('Accept', 'application/json')
      .set('token', companyCreated.token)
      .end((err, res) => {
        if (err) done(err)

        expect(res.statusCode).toBe(201)

        expect(res.body).toHaveProperty('businessId')
        expect(res.body).toHaveProperty('crmIds')
        expect(res.body).toHaveProperty('customerId')
        expect(res.body).toHaveProperty('isBatch')

        done()
      })
  })

  it('List all business', async (done) => {
    request
      .get('/api/v2/business')
      .set('token', companyCreated.token)
      .end((err, res) => {
        if (err) done(err)

        expect(res.statusCode).toBe(200)

        const result = res.body[0]

        expect(result).toHaveProperty('_id')
        expect(result).toHaveProperty('name')
        expect(result).toHaveProperty('activeUntil')
        expect(result).toHaveProperty('active')
        expect(result).toHaveProperty('dataAmount')
        expect(result).toHaveProperty('createdAt')
        expect(result).toHaveProperty('updatedAt')

        done()
      })
  })

  it('Get a business by ID', async (done) => {
    request
      .get(`/api/v2/business/${businessCreated.businessId}`)
      .set('token', companyCreated.token)
      .end((err, res) => {
        if (err) done(err)

        expect(res.statusCode).toBe(200)

        const bResult = res.body

        expect(bResult).toHaveProperty('quantityRows')
        expect(bResult).toHaveProperty('activeUntil')
        expect(bResult).toHaveProperty('customerStorage')
        expect(bResult).toHaveProperty('name')
        expect(bResult.data[0]).toHaveProperty('name')
        expect(bResult.data[0]).toHaveProperty('cpf_cnpj')
        expect(bResult).toHaveProperty('filePath')
        expect(bResult).toHaveProperty('templateId')
        expect(bResult).toHaveProperty('invalids')
        expect(bResult).toHaveProperty('active')
        expect(bResult).toHaveProperty('createdAt')
        expect(bResult).toHaveProperty('updatedAt')
        expect(bResult).toHaveProperty('flow_passed')

        done()
      })
  })

  it('Activate a business', async (done) => {
    request
      .put(`/api/v2/business/${businessCreated.businessId}/activate`)
      .send({ active_until: '2050-01-02' })
      .set('Accept', 'application/json')
      .set('token', companyCreated.token)
      .end((err, res) => {
        if (err) done(err)

        expect(res.statusCode).toBe(200)

        done()
      })
  })

  it('Deactivate a business', async (done) => {
    request
      .put(`/api/v2/business/${businessCreated.businessId}/deactivate`)
      .set('token', companyCreated.token)
      .end((err, res) => {
        if (err) done(err)

        expect(res.statusCode).toBe(200)

        done()
      })
  })

  it('Get a register on business by ID', async (done) => {
    const register = businessCreated.valids[0]

    request
      .get(`/api/v2/business/${businessCreated.businessId}/data/${register._id}`)
      .set('token', companyCreated.token)
      .set('templateid', templateCreated._id)
      .set('Accept', 'application/json')
      .end((err, res) => {
        if (err) done(err)

        expect(res.statusCode).toBe(200)

        const result = res.body

        expect(result).toHaveProperty('_id')
        expect(result).toHaveProperty('name')
        expect(result.data.name).toBe(register.name)
        expect(result.data.cpf_cnpj).toBe(register.cpf_cnpj)
        expect(result.data._id).toBe(register._id)

        done()
      })
  })

  it('Search register on business by CPF/CNPJ', async (done) => {
    request
      .get(`/api/v2/business/search?cpfcnpj=${b.data[0].cpf_cnpj}`)
      .set('token', companyCreated.token)
      .set('templateid', templateCreated._id)
      .end((err, res) => {
        if (err) done(err)

        expect(res.statusCode).toBe(200)

        const fResult = res.body[0]

        expect(fResult).toHaveProperty('_id')
        expect(fResult).toHaveProperty('name')
        expect(fResult).toHaveProperty('createdAt')
        expect(fResult).toHaveProperty('data')
        expect(fResult.data[0]).toHaveProperty('name')
        expect(fResult.data[0]).toHaveProperty('cpf_cnpj')
        expect(fResult.data[0]).toHaveProperty('_id')

        done()
      })
  })

  it('Update register on business by ID', async (done) => {
    const register = businessCreated.valids[0]
    register.idCrm = 1

    const cResult = {
      id: 1,
      cpfcnpj: '88010287334',
      name: 'Pessoa',
      person_type: null,
      cpfcnpj_status: null,
      birthdate: null,
      gender: null,
      mother_name: null,
      deceased: null,
      occupation: null,
      income: null,
      credit_risk: null,
      email: [],
      address: [],
      phone: [],
      business_partner: [],
      vehicle: [],
      schema_list: []
    }

    nock('http://localhost:4000', {
      reqheaders: {
        token: companyCreated.token
      }
    })
      .intercept(`/api/v1/customers/${cResult.id}`, 'OPTIONS')
      .reply(200)
      .get(`/api/v1/customers/${cResult.id}`)
      .reply(200, cResult)

    nock('http://localhost:4000', {
      reqheaders: {
        token: companyCreated.token
      }
    })
      .intercept('/api/v1/customers/1', 'OPTIONS')
      .reply(200)
      .put('/api/v1/customers/1')
      .reply(200)

    request
      .put(`/api/v2/business/${businessCreated.businessId}/data/${register._id}`)
      .send({ name: 'Pessoa X', idCrm: 1 })
      .set('Accept', 'application/json')
      .set('token', companyCreated.token)
      .set('templateid', templateCreated._id)
      .end((err, res) => {
        if (err) done(err)

        console.log(res.body)

        expect(res.statusCode).toBe(200)

        expect(res.body.name).toBe('Pessoa X')
        expect(res.body.cpf_cnpj).toBe(register.cpf_cnpj)
        expect(res.body._id).toBe(register._id)

        done()
      })
  })

  it('Get pool data with specific fields', async (done) => {
    const register = businessCreated.valids[0]

    const paramsRequest = {
      data: [{ schama: `${templateCreated._id}`, lote_id: `${businessCreated.businessId}`, item_id: register._id }],
      fields: ['name']
    }

    console.log(paramsRequest)

    request
      .post(`/api/v2/business/get_pool_data`)
      .send(paramsRequest)
      .set('Accept', 'application/json')
      .set('token', companyCreated.token)
      .end((err, res) => {
        if (err) done(err)

        expect(res.statusCode).toBe(200)

        expect(Object.keys(res.body[0])).toEqual(['_id', 'name'])

        done()
      })
  })

  it('Search data on business by template ID', async (done) => {
    const register = businessCreated.valids[1]

    const paramsRequest = {
      template_id: templateCreated._id,
      search_params: {
        value: register.cpf_cnpj
      }
    }

    request
      .post('/api/v2/business/full_search')
      .send(paramsRequest)
      .set('token', companyCreated.token)
      .end((err, res) => {
        if (err) done(err)

        expect(res.statusCode).toBe(200)

        const fResult = res.body[0]

        expect(fResult).toHaveProperty('_id')
        expect(fResult).toHaveProperty('name')
        expect(fResult).toHaveProperty('activeUntil')
        expect(fResult).toHaveProperty('flow_passed')
        expect(fResult).toHaveProperty('active')
        expect(fResult).toHaveProperty('createdAt')
        expect(fResult).toHaveProperty('updatedAt')

        expect(fResult.data[0].name).toBe(register.name)
        expect(fResult.data[0].cpf_cnpj).toBe(register.cpf_cnpj)
        expect(fResult.data[0]).toHaveProperty('_id')

        done()
      })
  })

  it('List all business paginated', async (done) => {
    request
      .get('/api/v2/business/paginated?page=0&limit=1')
      .set('token', companyCreated.token)
      .end((err, res) => {
        if (err) done(err)

        expect(res.statusCode).toBe(200)

        const fData = res.body.data[0]
        const pagination = res.body.pagination

        expect(pagination).toHaveProperty('numRows')
        expect(pagination).toHaveProperty('page')
        expect(pagination).toHaveProperty('firstPage')
        expect(pagination).toHaveProperty('lastPage')

        expect(fData).toHaveProperty('_id')
        expect(fData).toHaveProperty('name')
        expect(fData).toHaveProperty('activeUntil')
        expect(fData).toHaveProperty('active')
        expect(fData).toHaveProperty('createdAt')
        expect(fData).toHaveProperty('updatedAt')
        expect(fData).toHaveProperty('dataAmount')
        expect(fData).toHaveProperty('templateId')

        done()
      })
  })

  it('Get a business with data paginated', async (done) => {
    request
      .get(`/api/v2/business/${businessCreated.businessId}/paginated/?page=0&limit=1`)
      .set('token', companyCreated.token)
      .end((err, res) => {
        if (err) done(err)

        expect(res.statusCode).toBe(200)

        const bResult = res.body
        const pagination = res.body.dataPagination

        expect(bResult).toHaveProperty('quantityRows')
        expect(bResult).toHaveProperty('activeUntil')
        expect(bResult).toHaveProperty('customerStorage')
        expect(bResult).toHaveProperty('name')
        expect(bResult.data[0]).toHaveProperty('name')
        expect(bResult.data[0]).toHaveProperty('cpf_cnpj')
        expect(bResult).toHaveProperty('filePath')
        expect(bResult).toHaveProperty('templateId')
        expect(bResult).toHaveProperty('invalids')
        expect(bResult).toHaveProperty('active')
        expect(bResult).toHaveProperty('createdAt')
        expect(bResult).toHaveProperty('updatedAt')
        expect(bResult).toHaveProperty('flow_passed')

        expect(pagination).toHaveProperty('numRows')
        expect(pagination).toHaveProperty('page')
        expect(pagination).toHaveProperty('firstPage')
        expect(pagination).toHaveProperty('lastPage')

        done()
      })
  })

  it('Should create a business from JSON with fields document', async (done) => {
    businessDocument.templateId = templateDocumentCreated._id
    businessDocument.name = 'lote0001'

    nock('http://localhost:4000', {
      reqheaders: {
        token: companyCreated.token
      }
    })
      .intercept('/api/v1/customers', 'OPTIONS')
      .reply(200)
      .post('/api/v1/customers')
      .reply(200, { contact_ids: 1 })

    nock('https://api-storage-dev.s3.amazonaws.com').post('/').reply(200, [])

    request
      .post('/api/v2/business_json')
      .send(b)
      .set('Accept', 'application/json')
      .set('token', companyCreated.token)
      .end((err, res) => {
        if (err) done(err)

        expect(res.statusCode).toBe(201)

        expect(res.body).toHaveProperty('businessId')

        done()
      })
  })
})
