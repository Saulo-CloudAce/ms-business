const moment = require('moment')
const {
  createSingleCustomer,
  getByCpfCnpj,
  getAllCustomersByCompany,
  searchCustomer,
  updateCustomer,
  getCustomerById,
  getCustomerFormattedById,
  getAllCustomersByCompanyPaginated } = require('../services/crm-service')
const { clearCPFCNPJ } = require('../helpers/formatters')
const CompanyRepository = require('../repository/company-repository')
const TemplateRepository = require('../repository/template-repository')
const BusinessRepository = require('../repository/business-repository')

class CustomerController {
  _getInstanceRepositories (app) {
    const businessRepository = new BusinessRepository(app.locals.db)
    const companyRepository = new CompanyRepository(app.locals.db)
    const templateRepository = new TemplateRepository(app.locals.db)

    return { businessRepository, companyRepository, templateRepository }
  }

  async create (req, res) {
    req.assert('customer_cpfcnpj', 'O CPF/CNPJ é obrigatório').notEmpty()

    if (req.validationErrors()) return res.status(400).send({ errors: req.validationErrors() })

    const companyToken = req.headers['token']

    try {
      const { companyRepository } = this._getInstanceRepositories(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      const cpfcnpj = clearCPFCNPJ(req.body.customer_cpfcnpj)
      req.body.customer_cpfcnpj = cpfcnpj

      const request = await createSingleCustomer(req.body, companyToken, company.prefix_index_elastic)
      if (request.response && request.response.status && request.response.status !== 200) return res.status(request.response.status).send(request.response.data)
      return res.status(201).send(request.data)
    } catch (err) {
      return res.status(500).send({ error: err.message })
    }
  }

  async update (req, res) {
    req.assert('customer_cpfcnpj', 'O CPF/CNPJ é obrigatório').notEmpty()

    if (req.validationErrors()) return res.status(400).send({ errors: req.validationErrors() })

    const companyToken = req.headers['token']

    try {
      const { companyRepository } = this._getInstanceRepositories(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      const cpfcnpj = clearCPFCNPJ(req.body.customer_cpfcnpj)
      req.body.customer_cpfcnpj = cpfcnpj

      const request = await updateCustomer(req.params.id, req.body, companyToken)
      if (request.response && request.response.status && request.response.status != 200) return res.status(request.response.status).send(request.response.data)
      return res.status(200).send(request.data)
    } catch (err) {
      return res.status(500).send({ error: err.message })
    }
  }

  async getById (req, res) {
    const companyToken = req.headers['token']

    try {
      const { companyRepository, templateRepository, businessRepository } = this._getInstanceRepositories(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      const request = await getCustomerById(req.params.id, companyToken)

      if (request.response && request.response.status && request.response.status != 200) return res.status(request.response.status).send(request.response.data)

      const customer = request.data
      const templateList = customer.business_template_list
      let templates = []
      if (templateList && templateList.length > 0) {
        templates = await Promise.all(templateList.map(async templateId => {
          const template = await templateRepository.getById(templateId, companyToken)
          if (template) {
            const templateFinal = { _id: template._id, name: template.name }
            const fieldKey = template.fields.find(f => f.data === 'customer_cpfcnpj')
            if (fieldKey) {
              const keyCpfCnpj = fieldKey.column
              let data = await businessRepository.listAllAndChildsByTemplateAndKeySortedReverse(companyToken, templateId, keyCpfCnpj, customer.cpfcnpj, customer.business_list)
              data = data.filter(d => d.data)
              if (data && data.length > 0) {
                data.map(m => {
                  m.data = m.data.filter(md => md[keyCpfCnpj] === customer.cpfcnpj)

                  if (m.parentBatchId) {
                    m._id = m.parentBatchId
                    delete m.parentBatchId
                  }
                })
              }

              if (data.length > 0) templateFinal.lote_data_list = data.filter(d => d.data.length > 0)
              return templateFinal
            }
          }
        }))
      }

      if (customer) {
        customer.schema_list = templates.filter(t => t)
        delete customer.business_list
        delete customer.business_template_list
      }

      return res.status(200).send(customer)
    } catch (err) {
      console.error(err)
      return res.status(500).send({ error: err.message })
    }
  }

  async getByIdFormatted (req, res) {
    const companyToken = req.headers['token']

    try {
      const { companyRepository, templateRepository, businessRepository } = this._getInstanceRepositories(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      const request = await getCustomerFormattedById(req.params.id, companyToken)

      if (request.response && request.response.status && request.response.status != 200) return res.status(request.response.status).send(request.response.data)

      const customer = request.data
      const templateList = customer.business_template_list
      let templates = []
      if (templateList && templateList.length > 0) {
        templates = await Promise.all(templateList.map(async templateId => {
          const template = await templateRepository.getById(templateId, companyToken)
          if (template) {
            const templateFinal = { _id: template._id, name: template.name }
            const fieldKey = template.fields.find(f => f.data === 'customer_cpfcnpj')
            if (fieldKey) {
              const keyCpfCnpj = fieldKey.column
              let data = await businessRepository.listAllAndChildsByTemplateAndKeySortedReverse(companyToken, templateId, keyCpfCnpj, customer.customer_cpfcnpj, customer.business_list)
              data = data.filter(d => d.data)
              if (data && data.length > 0) {
                data.map(m => {
                  m.data = m.data.filter(md => md[keyCpfCnpj] === customer.customer_cpfcnpj)

                  if (m.parentBatchId) {
                    m._id = m.parentBatchId
                    delete m.parentBatchId
                  }
                })
              }

              if (data.length > 0) templateFinal.lote_data_list = data.filter(d => d.data.length > 0)
              return templateFinal
            }
          }
        }))
      }

      if (customer) {
        customer.schema_list = templates.filter(t => t)
        delete customer.business_list
        delete customer.business_template_list
      }

      return res.status(200).send(customer)
    } catch (err) {
      console.log(err)
      return res.status(500).send({ error: err.message })
    }
  }

  async getByCpfCnpj (req, res) {
    const companyToken = req.headers['token']

    try {
      const { companyRepository, templateRepository, businessRepository } = this._getInstanceRepositories(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      let cpfcnpj = req.query.cpfcnpj
      let request = null
      if (cpfcnpj) {
        cpfcnpj = clearCPFCNPJ(cpfcnpj)
        request = await getByCpfCnpj(cpfcnpj, companyToken)
      } else {
        request = await getAllCustomersByCompany(companyToken)
      }

      if (request.response && request.response.status && request.response.status != 200) return res.status(request.response.status).send(request.response.data)

      const customer = (request.data) ? request.data : []
      const templateList = (customer && customer.business_template_list) ? customer.business_template_list : []
      let templates = []
      if (templateList && templateList.length > 0) {
        templates = await Promise.all(templateList.map(async templateId => {
          const template = await templateRepository.getById(templateId, companyToken)
          if (template) {
            const templateFinal = { _id: template._id, name: template.name, updatedAt: template.updatedAt }
            const fieldKey = template.fields.find(f => f.data === 'customer_cpfcnpj')

            if (fieldKey) {
              const keyCpfCnpj = fieldKey.column
              let data = []
              if (cpfcnpj) {
                data = await businessRepository.listAllAndChildsByTemplateAndKeySortedReverse(companyToken, templateId, keyCpfCnpj, cpfcnpj, customer.business_list)
              } else {
                data = await businessRepository.listAllAndChildsByTemplateSortedReverse(companyToken, templateId)
              }

              data = data.filter(d => d.data)
              if (data && data.length > 0) {
                data.map(m => {
                  m.data = m.data.filter(md => md[keyCpfCnpj] === cpfcnpj)
                  if (m.parentBatchId) {
                    m._id = m.parentBatchId
                    delete m.parentBatchId
                  }
                })
              }
              if (data.length > 0) templateFinal.lote_data_list = data.filter(d => d.data.length > 0)
              return templateFinal
            }
          }
        }))
      }

      customer.schema_list = templates.filter(t => t).sort((a, b) => moment(b.updatedAt) - moment(a.updatedAt))
      delete customer.business_list
      delete customer.business_template_list

      return res.status(200).send(customer)
    } catch (err) {
      console.error(err)
      return res.status(500).send({ error: err.message })
    }
  }

  async getAllByCompanyPaginated (req, res) {
    const companyToken = req.headers['token']
    let page = 0
    let limit = 10
    if (req.query.page && parseInt(req.query.page) >= 0) page = parseInt(req.query.page)
    if (req.query.limit && parseInt(req.query.limit) >= 0) limit = parseInt(req.query.limit)

    try {
      var { companyRepository } = this._getInstanceRepositories(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      const request = await getAllCustomersByCompanyPaginated(companyToken, page, limit)

      if (request.response && request.response.status && request.response.status != 200) return res.status(request.response.status).send(request.response.data)

      return res.status(200).send(request.data)
    } catch (err) {
      console.error(err)
      return res.status(500).send({ error: err.message })
    }
  }

  async search (req, res) {
    const companyToken = req.headers['token']
    const queryTemplateId = req.headers['template_id']

    try {
      const { companyRepository, templateRepository, businessRepository } = this._getInstanceRepositories(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      const search = req.query.search
      const request = await searchCustomer(search, companyToken, company.prefix_index_elastic)

      if (request.response && request.response.status && request.response.status !== 200) return res.status(request.response.status).send(request.response.data)
      let customers = (Array.isArray(request.data)) ? request.data : []

      if (queryTemplateId && String(queryTemplateId).length > 0) {
        customers = customers.filter(c => c.business_template_list.indexOf(queryTemplateId) >= 0)
      }

      for (const i in customers) {
        const customer = customers[i]
        let templateList = customer.business_template_list
        if (queryTemplateId && String(queryTemplateId).length > 0) {
          templateList = [queryTemplateId]
        }

        let templates = []
        if (templateList && templateList.length > 0) {
          templates = await Promise.all(templateList.map(async templateId => {
            const template = await templateRepository.getById(templateId, companyToken)
            if (template) {
              const templateFinal = { _id: template._id, name: template.name }
              const fieldKey = template.fields.find(f => f.data === 'customer_cpfcnpj')
              if (fieldKey) {
                const keyCpfCnpj = fieldKey.column
                const customerKey = (customer.cpfcnpj) ? customer.cpfcnpj : customer.customer_cpfcnpj
                let data = await businessRepository.listAllAndChildsByTemplateAndKeySortedReverse(companyToken, templateId, keyCpfCnpj, customerKey, customer.business_list)
                data = data.filter(m => m.data)
                if (data && data.length > 0) {
                  data.map(m => {
                    m.data = m.data.filter(md => md[keyCpfCnpj] === customerKey)
                    if (m.parentBatchId) {
                      m._id = m.parentBatchId
                      delete m.parentBatchId
                    }
                  })
                }

                if (data.length > 0) templateFinal.lote_data_list = data.filter(d => d.data.length > 0)
                return templateFinal
              }
            }
          }))
        }

        if (customer) {
          customer.schema_list = templates.filter(t => t)
          delete customer.business_list
          delete customer.business_template_list
        }
      }

      customers = customers.sort((a, b) => (a.customer_name > b.customer_name) ? 1 : ((b.customer_name > a.customer_name) ? -1 : 0))

      return res.status(200).send(customers)
    } catch (err) {
      console.error(err)
      return res.status(500).send({ error: err.message })
    }
  }
}

module.exports = CustomerController
