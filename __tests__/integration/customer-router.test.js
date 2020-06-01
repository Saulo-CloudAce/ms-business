const supertest = require('supertest')
const nock = require('nock')
const axios = require('axios')

axios.defaults.adapter = require('axios/lib/adapters/http')

const app = require('../../config/server')
const { connect } = require('../../config/mongodb')

const CompanyModel = require('../../domain-v2/company')
const CompanyRepository = require('../../src-v2/repository/company-repository')

let companyModel = ''
let companyRepository = ''

const request = supertest(app)

let companyCreated = ''

const customer = {
  customer_cpfcnpj: '88010287334',
  customer_name: 'Pessoal Y',
  customer_email: [
    { customer_email: 'pessoay@email.com' }
  ]
}

const c = {
  name: 'company-test-c',
  prefix_index_elastic: 'company-test-c',
  callback: 'http://localhost:5500/v1/crm-c'
}

async function createCompany () {
  return companyModel.create(c.name, c.prefix_index_elastic, c.callback)
}

describe ('Customer functions', () => {
  beforeAll(async () => {
    await new Promise((resolve, reject) => {
      connect(app, async () => {
        await app.locals.db.collection('business').remove({})

        companyRepository = new CompanyRepository(app.locals.db)
        companyModel = new CompanyModel(companyRepository)

        companyCreated = await createCompany()

        resolve()
      })
    })
  })

  it ('Create a single customer', async (done) => {
    const customerResult = customer
    customerResult.customer_id = 5

    nock('http://localhost:7000', {
      reqheaders: {
        token: companyCreated.token
      }
    })
      .intercept('/api/v1/customer', 'OPTIONS')
      .reply(200)
      .post('/api/v1/customer')
      .reply(200, customerResult)

    request
      .post('/api/v2/customers')
      .send(customer)
      .set('token', companyCreated.token)
      .end((err, res) => {
        if (err) done(err)

        expect(res.statusCode).toBe(201)

        expect(res.body.customer_cpfcnpj).toBe(customer.customer_cpfcnpj)
        expect(res.body.customer_name).toBe(customer.customer_name)
        expect(res.body.customer_email).toStrictEqual(customer.customer_email)
        expect(res.body).toHaveProperty('customer_id')

        done()
      })
  })

  it ('Update a single customer', async (done) => {
    const customerResult = customer
    customerResult.customer_id = 5

    nock('http://localhost:7000', {
      reqheaders: {
        token: companyCreated.token
      }
    })
      .intercept(`/api/v1/customers/${customerResult.customer_id}`, 'OPTIONS')
      .reply(200)
      .put(`/api/v1/customers/${customerResult.customer_id}`)
      .reply(200, customerResult)

    request
      .put(`/api/v2/customers/${customerResult.customer_id}`)
      .send({ customer_cpfcnpj: customer.customer_cpfcnpj, customer_name: 'Pessoa ZZZ' })
      .set('token', companyCreated.token)
      .end((err, res) => {
        if (err) done(err)

        expect(res.statusCode).toBe(200)

        done()
      })
  })

  it ('Get a customer by CPF/CNPJ', async (done) => {
    const cResult = {
      id: 5,
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

    nock('http://localhost:7000', {
      reqheaders: {
        token: companyCreated.token
      }
    })
      .intercept(`/api/v1/customers?cpfcnpj=${cResult.cpfcnpj}`, 'OPTIONS')
      .reply(200)
      .get(`/api/v1/customers?cpfcnpj=${cResult.cpfcnpj}`)
      .reply(200, cResult)

    request
      .get(`/api/v2/customers?cpfcnpj=${customer.customer_cpfcnpj}`)
      .set('token', companyCreated.token)
      .end((err, res) => {
        if (err) done(err)

        expect(res.statusCode).toBe(200)

        expect(res.body).toHaveProperty('id')
        expect(res.body).toHaveProperty('cpfcnpj')
        expect(res.body).toHaveProperty('name')
        expect(res.body).toHaveProperty('person_type')
        expect(res.body).toHaveProperty('cpfcnpj_status')
        expect(res.body).toHaveProperty('birthdate')
        expect(res.body).toHaveProperty('gender')
        expect(res.body).toHaveProperty('mother_name')
        expect(res.body).toHaveProperty('deceased')
        expect(res.body).toHaveProperty('occupation')
        expect(res.body).toHaveProperty('income')
        expect(res.body).toHaveProperty('credit_risk')
        expect(res.body).toHaveProperty('email')
        expect(res.body).toHaveProperty('phone')
        expect(res.body).toHaveProperty('address')
        expect(res.body).toHaveProperty('business_partner')
        expect(res.body).toHaveProperty('vehicle')
        expect(res.body).toHaveProperty('schema_list')

        done()
      })
  })

  it ('Get a customer by ID', async (done) => {
    const cResult = {
      id: 5,
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

    nock('http://localhost:7000', {
      reqheaders: {
        token: companyCreated.token
      }
    })
      .intercept(`/api/v1/customers/${cResult.id}`, 'OPTIONS')
      .reply(200)
      .get(`/api/v1/customers/${cResult.id}`)
      .reply(200, cResult)

    request
      .get(`/api/v2/customers/${cResult.id}`)
      .set('token', companyCreated.token)
      .end((err, res) => {
        if (err) done(err)

        expect(res.statusCode).toBe(200)

        expect(res.body).toHaveProperty('id')
        expect(res.body).toHaveProperty('cpfcnpj')
        expect(res.body).toHaveProperty('name')
        expect(res.body).toHaveProperty('person_type')
        expect(res.body).toHaveProperty('cpfcnpj_status')
        expect(res.body).toHaveProperty('birthdate')
        expect(res.body).toHaveProperty('gender')
        expect(res.body).toHaveProperty('mother_name')
        expect(res.body).toHaveProperty('deceased')
        expect(res.body).toHaveProperty('occupation')
        expect(res.body).toHaveProperty('income')
        expect(res.body).toHaveProperty('credit_risk')
        expect(res.body).toHaveProperty('email')
        expect(res.body).toHaveProperty('phone')
        expect(res.body).toHaveProperty('address')
        expect(res.body).toHaveProperty('business_partner')
        expect(res.body).toHaveProperty('vehicle')
        expect(res.body).toHaveProperty('schema_list')

        done()
      })
  })

  it ('Get a customer by ID with fields formatted', async (done) => {
    const cResult = {
      id: 5,
      customer_cpfcnpj: '88010287334',
      customer_name: 'Pessoal Y',
      customer_deceased: null,
      customer_email: [
        { id: 100, customer_email: 'pessoay@email.com' }
      ],
      customer_address: [],
      customer_business_partner: [],
      customer_phone: [],
      customer_vehicle: [],
      schema_list: []
    }

    nock('http://localhost:7000', {
      reqheaders: {
        token: companyCreated.token
      }
    })
      .intercept(`/api/v1/customers/${cResult.id}/formatted`, 'OPTIONS')
      .reply(200)
      .get(`/api/v1/customers/${cResult.id}/formatted`)
      .reply(200, cResult)

    request
      .get(`/api/v2/customers/${cResult.id}/formatted`)
      .set('token', companyCreated.token)
      .end((err, res) => {
        if (err) done(err)

        expect(res.statusCode).toBe(200)

        expect(res.body).toHaveProperty('id')
        expect(res.body).toHaveProperty('customer_cpfcnpj')
        expect(res.body).toHaveProperty('customer_name')
        expect(res.body).toHaveProperty('customer_deceased')
        expect(res.body).toHaveProperty('customer_email')
        expect(res.body).toHaveProperty('customer_address')
        expect(res.body).toHaveProperty('customer_business_partner')
        expect(res.body).toHaveProperty('customer_phone')
        expect(res.body).toHaveProperty('customer_vehicle')
        expect(res.body).toHaveProperty('schema_list')

        done()
      })
  })

  it ('Search a customer by ID with fields formatted', async (done) => {
    const cResult = {
      id: 5,
      customer_cpfcnpj: '88010287334',
      customer_name: 'Pessoal Y',
      customer_email: [
        { id: 100, customer_email: 'pessoay@email.com' }
      ],
      customer_phome: [],
      business_list: [],
      business_template_list: []
    }

    nock('http://localhost:7000', {
      reqheaders: {
        token: companyCreated.token
      }
    })
      .intercept(`/api/v1/customers/search?search=${cResult.customer_cpfcnpj}`, 'OPTIONS')
      .reply(200)
      .get(`/api/v1/customers/search?search=${cResult.customer_cpfcnpj}`)
      .reply(200, [cResult])

    request
      .get(`/api/v2/customers/search?search=${cResult.customer_cpfcnpj}`)
      .set('token', companyCreated.token)
      .end((err, res) => {
        if (err) done(err)

        expect(res.statusCode).toBe(200)

        const fResult = res.body[0]

        expect(fResult).toHaveProperty('id')
        expect(fResult).toHaveProperty('customer_cpfcnpj')
        expect(fResult).toHaveProperty('customer_name')
        expect(fResult).toHaveProperty('customer_email')
        expect(fResult).toHaveProperty('customer_phome')
        expect(fResult).toHaveProperty('schema_list')

        done()
      })
  })

  it ('List all customers', async (done) => {
    const cResult = {
      customers: [{
        id: 5,
        cpfcnpj: '88010287334',
        name: 'Pessoal Y',
        email: [
          { id: 100, email: 'pessoay@email.com' }
        ],
        phone: []
      }],
      pagination: {
        numRows: 1,
        page: 0,
        firstPage: 1,
        lastPage: 1
      }
    }

    nock('http://localhost:7000', {
      reqheaders: {
        token: companyCreated.token
      }
    })
      .intercept(`/api/v1/customers/all?page=0&limit=1`, 'OPTIONS')
      .reply(200)
      .get(`/api/v1/customers/all?page=0&limit=1`)
      .reply(200, cResult)

    request
      .get(`/api/v2/customers/paginated?page=0&limit=1`)
      .set('token', companyCreated.token)
      .end((err, res) => {
        if (err) done(err)

        expect(res.statusCode).toBe(200)

        const resultCustomers = res.body.customers[0]
        const resultPagination = res.body.pagination

        expect(resultCustomers).toHaveProperty('id')
        expect(resultCustomers).toHaveProperty('cpfcnpj')
        expect(resultCustomers).toHaveProperty('name')
        expect(resultCustomers).toHaveProperty('email')
        expect(resultCustomers).toHaveProperty('phone')

        expect(resultPagination).toHaveProperty('numRows')
        expect(resultPagination).toHaveProperty('page')
        expect(resultPagination).toHaveProperty('firstPage')
        expect(resultPagination).toHaveProperty('lastPage')

        done()
      })
  })
})
