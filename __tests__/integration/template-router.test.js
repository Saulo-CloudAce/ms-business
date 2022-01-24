const supertest = require('supertest')

const app = require('../../config/server')
const { connect } = require('../../config/mongodb')

const CompanyModel = require('../../domain-v2/company')
const CompanyRepository = require('../../src-v2/repository/company-repository')
const TemplateRepository = require('../../src-v2/repository/template-repository')
const BusinessRepository = require('../../src-v2/repository/business-repository')

let companyModel = ''
let companyRepository = ''
let templateRepository = ''
let businessRepository = ''

const request = supertest(app)

let companyCreated = ''

async function createCompany() {
  const c = {
    name: 'company-test-t',
    prefix_index_elastic: 'company-test-t',
    callback: 'http://localhost:5500/v1/crm-t'
  }
  return companyModel.create(c.name, c.prefix_index_elastic, c.callback)
}

describe('CRUD template', () => {
  beforeAll(async () => {
    await new Promise((resolve, reject) => {
      connect(app, async () => {
        await app.locals.db.collection('business_template').remove({})

        companyRepository = new CompanyRepository(app.locals.db)
        companyModel = new CompanyModel(companyRepository)
        templateRepository = new TemplateRepository(app.locals.db)
        businessRepository = new BusinessRepository(app.locals.db)

        companyCreated = await createCompany()

        resolve()
      })
    })
  })

  it('Create a simple template with customer fields', async (done) => {
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
          editable: false,
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
      ]
    }
    request
      .post('/api/v2/templates')
      .send(t)
      .set('Accept', 'application/json')
      .set('token', companyCreated.token)
      .end((err, res) => {
        if (err) done(err)

        expect(res.statusCode).toBe(201)

        expect(res.body).toHaveProperty('_id')

        done()
      })
  })

  it('Create a simple template without customer fields', async (done) => {
    const t = {
      name: 'template simples sem customer',
      fields: [
        {
          type: 'string',
          column: 'name',
          data: 'name',
          label: 'Nome',
          key: false,
          operator_can_view: true,
          required: true,
          editable: false,
          visible: true
        },
        {
          type: 'cpfcnpj',
          column: 'cpf_cnpj',
          data: 'cpfcnpj',
          label: 'CPF/CNPJ',
          key: false,
          operator_can_view: true,
          required: true,
          editable: false,
          visible: true
        }
      ]
    }
    request
      .post('/api/v2/templates')
      .send(t)
      .set('Accept', 'application/json')
      .set('token', companyCreated.token)
      .end((err, res) => {
        if (err) done(err)

        expect(res.statusCode).toBe(201)

        expect(res.body).toHaveProperty('_id')

        done()
      })
  })

  it('Create a complex template', async (done) => {
    const t = {
      name: 'template complex',
      fields: [
        {
          type: 'string',
          column: 'name',
          data: 'customer_name',
          label: 'Nome',
          key: false,
          operator_can_view: true,
          required: true,
          editable: false,
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
          type: 'array',
          column: 'phones',
          data: 'customer_phone',
          label: 'Telefones',
          key: false,
          operator_can_view: true,
          required: true,
          editable: true,
          visible: true,
          fields: [
            {
              type: 'phone_number',
              column: 'phone_number1',
              data: 'customer_phone_number',
              label: 'Nº Telefone',
              key: false,
              operator_can_view: false,
              required: true,
              editable: true,
              visible: true
            },
            {
              type: 'string',
              column: 'phone_type1',
              data: 'customer_phone_type',
              label: 'Tipo Telefone',
              key: false,
              operator_can_view: false,
              required: true,
              editable: true,
              visible: true
            }
          ]
        }
      ]
    }
    request
      .post('/api/v2/templates')
      .send(t)
      .set('Accept', 'application/json')
      .set('token', companyCreated.token)
      .end((err, res) => {
        if (err) done(err)

        expect(res.statusCode).toBe(201)

        done()
      })
  })

  it('List all templates by company', async (done) => {
    request
      .get('/api/v2/templates')
      .set('token', companyCreated.token)
      .end((err, res) => {
        if (err) done(err)

        expect(res.statusCode).toBe(200)

        const firstResult = res.body[0]

        expect(firstResult).toHaveProperty('_id')
        expect(firstResult).toHaveProperty('name')
        expect(firstResult).toHaveProperty('active')
        expect(firstResult).toHaveProperty('createdAt')

        done()
      })
  })

  it('Get a template', async (done) => {
    const t = {
      name: 'template simples - 1',
      fields: [
        {
          type: 'string',
          column: 'name',
          data: 'customer_name',
          label: 'Nome',
          key: false,
          operator_can_view: true,
          required: true,
          editable: false,
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
    const tCreated = await templateRepository.save(t.name, t.fields, companyCreated.token, t.active)

    request
      .get(`/api/v2/templates/${tCreated._id}`)
      .set('token', companyCreated.token)
      .end((err, res) => {
        if (err) done(err)

        expect(res.statusCode).toBe(200)

        expect(res.body.name).toBe(t.name)
        expect(res.body.active).toBe(t.active)
        expect(res.body).toHaveProperty('fields')
        expect(res.body).toHaveProperty('createdAt')

        done()
      })
  })

  it('Active a template', async (done) => {
    const t = {
      name: 'template simples - 1',
      fields: [
        {
          type: 'string',
          column: 'name',
          data: 'customer_name',
          label: 'Nome',
          key: false,
          operator_can_view: true,
          required: true,
          editable: false,
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
      active: false
    }
    const tCreated = await templateRepository.save(t.name, t.fields, companyCreated.token, t.active)

    request
      .put(`/api/v2/templates/${tCreated._id}/activate`)
      .set('Accept', 'application/json')
      .set('token', companyCreated.token)
      .end((err, res) => {
        if (err) done(err)

        expect(res.statusCode).toBe(200)

        done()
      })
  })

  it('Deactivate a template', async (done) => {
    const t = {
      name: 'template simples - 2',
      fields: [
        {
          type: 'string',
          column: 'name',
          data: 'customer_name',
          label: 'Nome',
          key: false,
          operator_can_view: true,
          required: true,
          editable: false,
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
      active: false
    }
    const tCreated = await templateRepository.save(t.name, t.fields, companyCreated.token, t.active)

    request
      .put(`/api/v2/templates/${tCreated._id}/deactivate`)
      .set('Accept', 'application/json')
      .set('token', companyCreated.token)
      .end((err, res) => {
        if (err) done(err)

        expect(res.statusCode).toBe(200)

        done()
      })
  })

  it('Update a template', async (done) => {
    const t = {
      name: 'template simples - 3',
      fields: [
        {
          type: 'string',
          column: 'name',
          data: 'customer_name',
          label: 'Nome',
          key: false,
          operator_can_view: true,
          required: true,
          editable: false,
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
      active: false
    }
    const tCreated = await templateRepository.save(t.name, t.fields, companyCreated.token, t.active)

    const tUpdate = t
    tUpdate.name = 'template updated'
    tUpdate.fields[0].label = 'Name 1'
    tUpdate.fields[0].visible = false
    tUpdate.fields[0].operator_can_view = false

    request
      .put(`/api/v2/templates/${tCreated._id}`)
      .send(tUpdate)
      .set('Accept', 'application/json')
      .set('token', companyCreated.token)
      .end((err, res) => {
        if (err) done(err)

        expect(res.statusCode).toBe(200)

        expect(res.body.name).toBe(tUpdate.name)
        expect(res.body.fields[0].label).toBe(tUpdate.fields[0].label)
        expect(res.body.fields[0].visible).toBe(tUpdate.fields[0].visible)
        expect(res.body.fields[0].operator_can_view).toBe(tUpdate.fields[0].operator_can_view)

        done()
      })
  })

  // it('Get data from template', async (done) => {
  //   const t = {
  //     name: 'template simples - 4',
  //     fields: [
  //       {
  //         type: 'string',
  //         column: 'name',
  //         data: 'customer_name',
  //         label: 'Nome',
  //         key: false,
  //         operator_can_view: true,
  //         required: true,
  //         editable: false,
  //         visible: true
  //       },
  //       {
  //         type: 'cpfcnpj',
  //         column: 'cpf_cnpj',
  //         data: 'customer_cpfcnpj',
  //         label: 'CPF/CNPJ',
  //         key: true,
  //         operator_can_view: true,
  //         required: true,
  //         editable: false,
  //         visible: true
  //       }
  //     ],
  //     active: false
  //   }
  //   const tCreated = await templateRepository.save(t.name, t.fields, companyCreated.token, t.active)

  //   request
  //     .get(`/api/v2/templates/${tCreated._id}/data`)
  //     .set('token', companyCreated.token)
  //     .end((err, res) => {
  //       if (err) done(err)

  //       expect(res.statusCode).toBe(200)

  //       expect(res.body).toHaveProperty('_id')
  //       expect(res.body).toHaveProperty('name')
  //       expect(res.body).toHaveProperty('data')

  //       done()
  //     })
  // })

  it('List data paginated from template', async (done) => {
    const t = {
      name: 'template simples - 5',
      fields: [
        {
          type: 'string',
          column: 'name',
          data: 'customer_name',
          label: 'Nome',
          key: false,
          operator_can_view: true,
          required: true,
          editable: false,
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
          type: 'string',
          column: 'produto',
          data: 'produto',
          label: 'Produto',
          key: true,
          operator_can_view: true,
          required: true,
          editable: false,
          visible: true
        },
        {
          type: 'int',
          column: 'idade',
          data: 'idade',
          label: 'Idade',
          key: true,
          operator_can_view: true,
          required: true,
          editable: false,
          visible: true
        }
      ],
      active: false
    }
    const tCreated = await templateRepository.save(t.name, t.fields, companyCreated.token, t.active)

    const mailing = {
      companyToken: companyCreated.token,
      name: 'Mailing teste 1',
      filePath: '',
      templateId: tCreated._id.toString(),
      quantityRows: 3,
      fieldsData: [
        {
          name: 'Cliente 1',
          cpf_cnpj: '00000000001',
          produto: 'Alfinete',
          idade: 10
        },
        {
          name: 'Cliente 2',
          cpf_cnpj: '00000000002',
          produto: 'Mouse',
          idade: 20
        },
        {
          name: 'Cliente 3',
          cpf_cnpj: '00000000003',
          produto: 'Abóbora',
          idade: 35
        }
      ]
    }

    await businessRepository.save(
      mailing.companyToken,
      mailing.name,
      mailing.filePath,
      mailing.templateId,
      mailing.quantityRows,
      mailing.fieldsData
    )

    request
      .get(`/api/v2/templates/${tCreated._id}/data/paginated?page=0&limit=1`)
      .set('token', companyCreated.token)
      .end((err, res) => {
        if (err) done(err)

        expect(res.statusCode).toBe(200)

        expect(res.body).toHaveProperty('data')
        expect(res.body).toHaveProperty('pagination')

        const pagination = res.body.pagination
        expect(pagination.numRows).toBe(3)
        expect(pagination.page).toBe(0)
        expect(pagination.firstPage).toBe(0)
        expect(pagination.lastPage).toBe(2)

        done()
      })
  })

  it('Should list data paginated from template filtered by criteria', async (done) => {
    const t = {
      name: 'template simples - 6',
      fields: [
        {
          type: 'string',
          column: 'name',
          data: 'customer_name',
          label: 'Nome',
          key: false,
          operator_can_view: true,
          required: true,
          editable: false,
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
          type: 'string',
          column: 'produto',
          data: 'produto',
          label: 'Produto',
          key: true,
          operator_can_view: true,
          required: true,
          editable: false,
          visible: true
        },
        {
          type: 'int',
          column: 'idade',
          data: 'idade',
          label: 'Idade',
          key: true,
          operator_can_view: true,
          required: true,
          editable: false,
          visible: true
        }
      ],
      active: false
    }
    const tCreated = await templateRepository.save(t.name, t.fields, companyCreated.token, t.active)

    const mailing = {
      companyToken: companyCreated.token,
      name: 'Mailing teste 1',
      filePath: '',
      templateId: tCreated._id.toString(),
      quantityRows: 3,
      fieldsData: [
        {
          name: 'Cliente 1',
          cpf_cnpj: '00000000001',
          produto: 'Alfinete',
          idade: 10
        },
        {
          name: 'Cliente 2',
          cpf_cnpj: '00000000002',
          produto: 'Mouse',
          idade: 20
        },
        {
          name: 'Cliente 3',
          cpf_cnpj: '00000000003',
          produto: 'Abóbora',
          idade: 35
        }
      ]
    }

    await businessRepository.save(
      mailing.companyToken,
      mailing.name,
      mailing.filePath,
      mailing.templateId,
      mailing.quantityRows,
      mailing.fieldsData
    )

    request
      .get(`/api/v2/templates/${tCreated._id}/data/paginated?page=0&limit=1&filter_by=[{"produto":["Alfinete"]}]`)
      .set('token', companyCreated.token)
      .end((err, res) => {
        if (err) done(err)

        expect(res.statusCode).toBe(200)

        expect(res.body).toHaveProperty('data')
        expect(res.body).toHaveProperty('pagination')

        const data = res.body.data[0]
        expect(data.cpf_cnpj).toBe('00000000001')

        done()
      })
  })

  it('Should list data paginated from template sorted by criteria', async (done) => {
    const t = {
      name: 'template simples - 7',
      fields: [
        {
          type: 'string',
          column: 'name',
          data: 'customer_name',
          label: 'Nome',
          key: false,
          operator_can_view: true,
          required: true,
          editable: false,
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
          type: 'string',
          column: 'produto',
          data: 'produto',
          label: 'Produto',
          key: true,
          operator_can_view: true,
          required: true,
          editable: false,
          visible: true
        },
        {
          type: 'int',
          column: 'idade',
          data: 'idade',
          label: 'Idade',
          key: true,
          operator_can_view: true,
          required: true,
          editable: false,
          visible: true
        }
      ],
      active: false
    }
    const tCreated = await templateRepository.save(t.name, t.fields, companyCreated.token, t.active)

    const mailing = {
      companyToken: companyCreated.token,
      name: 'Mailing teste 1',
      filePath: '',
      templateId: tCreated._id.toString(),
      quantityRows: 3,
      fieldsData: [
        {
          name: 'Cliente 1',
          cpf_cnpj: '00000000001',
          produto: 'Alfinete',
          idade: 10
        },
        {
          name: 'Cliente 2',
          cpf_cnpj: '00000000002',
          produto: 'Mouse',
          idade: 20
        },
        {
          name: 'Cliente 3',
          cpf_cnpj: '00000000003',
          produto: 'Abóbora',
          idade: 35
        }
      ]
    }

    await businessRepository.save(
      mailing.companyToken,
      mailing.name,
      mailing.filePath,
      mailing.templateId,
      mailing.quantityRows,
      mailing.fieldsData
    )

    request
      .get(`/api/v2/templates/${tCreated._id}/data/paginated?page=0&limit=1&sort_by=[{"name": "desc"}]`)
      .set('token', companyCreated.token)
      .end((err, res) => {
        if (err) done(err)

        expect(res.statusCode).toBe(200)

        expect(res.body).toHaveProperty('data')
        expect(res.body).toHaveProperty('pagination')

        const data = res.body.data[0]
        expect(data.cpf_cnpj).toBe('00000000003')

        done()
      })
  })

  it('Should create with document fields', async (done) => {
    const t = {
      name: 'template documento 1',
      fields: [
        {
          type: 'string',
          column: 'name',
          data: 'name',
          label: 'Nome',
          key: false,
          operator_can_view: true,
          required: true,
          editable: false,
          visible: true
        },
        {
          type: 'cpfcnpj',
          column: 'cpf_cnpj',
          data: 'cpfcnpj',
          label: 'CPF/CNPJ',
          key: false,
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
          required: false,
          editable: true,
          visible: true,
          has_expiration: true
        }
      ]
    }
    request
      .post('/api/v2/templates')
      .send(t)
      .set('Accept', 'application/json')
      .set('token', companyCreated.token)
      .end((err, res) => {
        if (err) done(err)

        expect(res.statusCode).toBe(201)

        expect(res.body).toHaveProperty('_id')

        done()
      })
  })

  it('Create a simple template with fields to show on landing page', async (done) => {
    const t = {
      name: 'template simples com dados para landingpage',
      fields: [
        {
          type: 'string',
          column: 'name',
          data: 'name',
          label: 'Nome',
          key: false,
          operator_can_view: true,
          required: true,
          editable: false,
          visible: true,
          landingpage_can_show: true
        },
        {
          type: 'cpfcnpj',
          column: 'cpf_cnpj',
          data: 'cpfcnpj',
          label: 'CPF/CNPJ',
          key: false,
          operator_can_view: true,
          required: true,
          editable: false,
          visible: true,
          landingpage_can_show: false
        }
      ]
    }
    const requestCreate = await request
      .post('/api/v2/templates')
      .send(t)
      .set('Accept', 'application/json')
      .set('token', companyCreated.token)

    const requestGetTemplate = await request
      .get(`/api/v2/templates/${requestCreate.body._id}`)
      .set('Accept', 'application/json')
      .set('token', companyCreated.token)

    expect(requestCreate.statusCode).toBe(201)

    expect(requestCreate.body).toHaveProperty('_id')

    expect(requestGetTemplate.body.name).toBe(t.name)

    expect(requestGetTemplate.body.fields[0].landingpage_can_show).toBe(true)

    expect(requestGetTemplate.body.fields[1].landingpage_can_show).toBe(false)

    done()
  })

  it('Create a simple template without fields to show on landing page', async (done) => {
    const t = {
      name: 'template simples sem dados para landingpage',
      fields: [
        {
          type: 'string',
          column: 'name',
          data: 'name',
          label: 'Nome',
          key: false,
          operator_can_view: true,
          required: true,
          editable: false,
          visible: true
        },
        {
          type: 'cpfcnpj',
          column: 'cpf_cnpj',
          data: 'cpfcnpj',
          label: 'CPF/CNPJ',
          key: false,
          operator_can_view: true,
          required: true,
          editable: false,
          visible: true
        }
      ]
    }
    const requestCreate = await request
      .post('/api/v2/templates')
      .send(t)
      .set('Accept', 'application/json')
      .set('token', companyCreated.token)

    const requestGetTemplate = await request
      .get(`/api/v2/templates/${requestCreate.body._id}`)
      .set('Accept', 'application/json')
      .set('token', companyCreated.token)

    expect(requestCreate.statusCode).toBe(201)

    expect(requestCreate.body).toHaveProperty('_id')

    expect(requestGetTemplate.body.name).toBe(t.name)

    expect(requestGetTemplate.body.fields[0].landingpage_can_show).toBe(false)

    expect(requestGetTemplate.body.fields[1].landingpage_can_show).toBe(false)

    done()
  })
})
