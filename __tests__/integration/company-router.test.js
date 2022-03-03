import supertest from 'supertest'

import app from '../../config/server.js'
import { connect } from '../../config/mongodb.js'

import CompanyModel from '../../domain-v2/company.js'
import CompanyRepository from '../../src-v2/repository/company-repository.js'

let companyModel = ''
let companyRepository = ''

const request = supertest(app)

describe('CRUD Company', () => {
  beforeAll(async () => {
    await new Promise((resolve, reject) => {
      connect(app, async () => {
        await app.locals.db.collection('company').remove({})

        companyRepository = new CompanyRepository(app.locals.db)
        companyModel = new CompanyModel(companyRepository)

        resolve()
      })
    })
  })

  afterAll(() => {
    app.locals.conn.close()
  })

  it('Create a company', async (done) => {
    const company = {
      name: 'company-test',
      prefix_index_elastic: 'company-test',
      callback: 'http://localhost:5500/api/v1/crm'
    }
    request
      .post('/api/v2/companies')
      .send(company)
      .set('Accept', 'application/json')
      .end((err, res) => {
        if (err) done(err)

        expect(res.statusCode).toBe(201)
        expect(res.body.name).toBe(company.name)
        expect(res.body.prefix_index_elastic).toBe(company.prefix_index_elastic)
        expect(res.body.callback).toBe(company.callback)
        expect(res.body.activated).toBe(true)
        expect(res.body).toHaveProperty('token')
        expect(res.body).toHaveProperty('_id')
        expect(res.body).toHaveProperty('created_at')
        expect(res.body).toHaveProperty('updated_at')

        done()
      })
  })

  it('List all companies', async (done) => {
    request.get('/api/v2/companies').end((err, res) => {
      if (err) done(err)

      expect(res.statusCode).toBe(200)

      const bodyResult = res.body[0]

      expect(bodyResult).toHaveProperty('_id')
      expect(bodyResult).toHaveProperty('token')
      expect(bodyResult).toHaveProperty('name')
      expect(bodyResult).toHaveProperty('prefix_index_elastic')
      expect(bodyResult).toHaveProperty('callback')
      expect(bodyResult).toHaveProperty('activated')
      expect(bodyResult).toHaveProperty('created_at')
      expect(bodyResult).toHaveProperty('updated_at')

      done()
    })
  })

  it('Get a company by ID', async (done) => {
    const c1 = {
      name: 'company-test-1',
      prefix_index_elastic: 'company-test-1',
      callback: 'http://localhost:5500/api/v1/crm'
    }
    const c1Created = await companyModel.create(c1.name, c1.prefix_index_elastic, c1.callback)

    request.get(`/api/v2/companies/${c1Created._id}`).end((err, res) => {
      if (err) done(err)

      const bodyResult = res.body

      expect(bodyResult).toHaveProperty('_id')
      expect(bodyResult).toHaveProperty('token')
      expect(bodyResult).toHaveProperty('name')
      expect(bodyResult).toHaveProperty('prefix_index_elastic')
      expect(bodyResult).toHaveProperty('callback')
      expect(bodyResult).toHaveProperty('activated')
      expect(bodyResult).toHaveProperty('created_at')
      expect(bodyResult).toHaveProperty('updated_at')

      done()
    })
  })

  it('Update a company', async (done) => {
    const c = {
      name: 'company-test-2',
      prefix_index_elastic: 'company-test-2',
      callback: 'http://localhost:5500/api/v1/crm'
    }
    const cCreated = await companyModel.create(c.name, c.prefix_index_elastic, c.callback)
    const cUpdate = {
      name: 'company-test-2-updated',
      callback: 'http://localhost:5500/api/v1/crm-updated',
      activated: false
    }
    request
      .put(`/api/v2/companies/${cCreated._id}`)
      .send(cUpdate)
      .set('Accept', 'application/json')
      .end((err, res) => {
        if (err) done(err)

        expect(res.statusCode).toBe(204)

        done()
      })
  })
})
