const supertest = require('supertest')
const nock = require('nock')

const app = require('../../config/server')
const { connect } = require('../../config/mongodb')

const CompanyModel = require('../../domain-v2/company')
const CompanyRepository = require('../../src-v2/repository/company-repository')
const TemplateRepository = require('../../src-v2/repository/template-repository')

let companyModel = ''
let companyRepository = ''
let templateRepository = ''

const request = supertest(app)

let companyCreated = ''
let templateCreated = ''

async function createCompany () {
  const c = {
    name: 'company-test-t',
    prefix_index_elastic: 'company-test-t',
    callback: 'http://localhost:5500/v1/crm-t'
  }
  return companyModel.create(c.name, c.prefix_index_elastic, c.callback)
}

async function createTemplate () {
  const t = {
    name: 'template simples',
    fields: [
      { type: 'string', column: 'name', data: 'customer_name', label: 'Nome', key: false, operator_can_view: true, required: true, editable: false, visible: true },
      { type: 'cpfcnpj', column: 'cpf_cnpj', data: 'customer_cpfcnpj', label: 'CPF/CNPJ', key: true, operator_can_view: true, required: true, editable: false, visible: true }
    ],
    active: true
  }

  return templateRepository.save(t.name, t.fields, companyCreated.token, t.active)
}

describe('CRUD business', () => {
  beforeAll(async () => {
    await new Promise((resolve, reject) => {
      connect(app, async () => {
        await app.locals.db.collection('business').remove({})

        companyRepository = new CompanyRepository(app.locals.db)
        companyModel = new CompanyModel(companyRepository)
        templateRepository = new TemplateRepository(app.locals.db)

        companyCreated = await createCompany()
        templateCreated = await createTemplate()

        resolve()
      })
    })
  })

  // it ('Create a business from JSON', async (done) => {
  //   const b = {
  //     name: 'lote 1',
  //     active_until: '2020-12-31',
  //     templateId: templateCreated._id,
  //     data: [
  //       { name: 'Pessoa 1', cpf_cnpj: '11122233344' },
  //       { name: 'Pessoa 2', cpf_cnpj: '21122233344' }
  //     ]
  //   }

  //   request
  //     .post('/api/v2/business_json')
  //     .send(b)
  //     .set('Accept', 'application/json')
  //     .set('token', companyCreated.token)
  //     .end((err, res) => {
  //       if (err) done(err)

  //       expect(res.statusCode).toBe(201)

  //       expect(res.body).toHaveProperty('businessId')

  //       done()
  //     })
  // })

  it ('Create a single register', async (done) => {
    const b = {
      templateId: templateCreated._id,
      data: [
        { name: 'Pessoa 1', cpf_cnpj: '11122233344' }
      ]
    }

    const scope = nock('http://localhost:7000')
      .matchHeader('token', companyCreated.token)
      .intercept('/api/v1/customers', 'OPTIONS')
      .reply(200)

    request
      .post('/api/v2/business_single_register')
      .send(b)
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
})
