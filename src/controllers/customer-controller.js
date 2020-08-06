const {
  createSingleCustomer,
  getByCpfCnpj,
  getAllCustomersByCompany,
  searchCustomer,
  updateCustomer,
  getCustomerById,
  getCustomerFormattedById } = require('../services/crm-service')
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
      var { companyRepository } = this._getInstanceRepositories(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      var cpfcnpj = req.body.customer_cpfcnpj
      cpfcnpj = cpfcnpj.replace(/\./g, '')
      cpfcnpj = cpfcnpj.replace(/-/g, '')
      cpfcnpj = cpfcnpj.replace(/\\/g, '')
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
      var { companyRepository } = this._getInstanceRepositories(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      var cpfcnpj = req.body.customer_cpfcnpj
      cpfcnpj = cpfcnpj.replace(/\./g, '')
      cpfcnpj = cpfcnpj.replace(/-/g, '')
      cpfcnpj = cpfcnpj.replace(/\\/g, '')
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
      var { companyRepository, templateRepository, businessRepository } = this._getInstanceRepositories(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      var request = await getCustomerById(req.params.id, companyToken)

      if (request.response && request.response.status && request.response.status != 200) return res.status(request.response.status).send(request.response.data)

      var customer = request.data
      let templateList = []
      if (customer && typeof customer === 'object' && customer.business_template_list) templateList = customer.business_template_list
      var templates = []
      if (templateList && templateList.length > 0) {
        templates = await Promise.all(templateList.map(async templateId => {
          var template = await templateRepository.getNameById(templateId, companyToken)
          if (template) {
            var data = await businessRepository.listAllByTemplate(companyToken, templateId)
            if (data && data.length > 0) {
              data.map(m => { m.data = m.data.filter(md => md.customer_cpfcnpj === customer.cpfcnpj) })
            }

            if (data.length > 0) template.lote_data_list = data.filter(d => d.data.length > 0)
            return template
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
      var { companyRepository, templateRepository, businessRepository } = this._getInstanceRepositories(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      var request = await getCustomerFormattedById(req.params.id, companyToken)

      if (request.response && request.response.status && request.response.status != 200) return res.status(request.response.status).send(request.response.data)

      var customer = request.data
      var templateList = customer.business_template_list
      var templates = []
      if (templateList && templateList.length > 0) {
        templates = await Promise.all(templateList.map(async templateId => {
console.log(templateId)
          var template = await templateRepository.getNameById(templateId, companyToken)
          if (template) {
            var data = await businessRepository.listAllByTemplate(companyToken, templateId)
            if (data && data.length > 0) {
              data.map(m => { m.data = m.data.filter(md => md.customer_cpfcnpj === customer.customer_cpfcnpj) })
            }

            if (data.length > 0) template.lote_data_list = data.filter(d => d.data.length > 0)
            return template
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
      var { companyRepository, templateRepository, businessRepository } = this._getInstanceRepositories(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      var cpfcnpj = req.query.cpfcnpj
      var request = null
      if (cpfcnpj) {
        cpfcnpj = cpfcnpj.replace(/\./g, '')
        cpfcnpj = cpfcnpj.replace(/-/g, '')
        cpfcnpj = cpfcnpj.replace(/\\/g, '')

        request = await getByCpfCnpj(cpfcnpj, companyToken)
      } else {
        request = await getAllCustomersByCompany(companyToken)
      }
// console.log('qweqweq------------------------------------------>', request)
      if (request.response && request.response.status && request.response.status != 200) return res.status(request.response.status).send(request.response.data)

      var customer = (request.data) ? request.data : []
      var templateList = (customer && customer.business_template_list) ? customer.business_template_list : []
      var businessList = (customer && customer.business_list) ? customer.business_list : []
      var templates = []
      if (templateList && templateList.length > 0) {
        templates = await Promise.all(templateList.map(async templateId => {
console.log(templateId)
          var template = await templateRepository.getNameById(templateId, companyToken)
console.log(template)
          if (template) {
            var data = await businessRepository.listAllByTemplate(companyToken, templateId)
		console.log(data.length)
            if (data && data.length > 0) {
              data = data.filter(d => businessList.includes(d._id.toString()))
	      const customerKey = (customer.cpfcnpj) ? customer.cpfcnpj : customer.customer_cpfcnpj
		console.log(customerKey)
              data.map(m => {
                m.data = m.data.filter(md => md.customer_cpfcnpj === customerKey)
              })
            }
            if (data.length > 0) template.lote_data_list = data.filter(d => d.data.length > 0)
            return template
          }
        }))
      }

      customer.schema_list = templates.filter(t => t)
      delete customer.business_list
      delete customer.business_template_list

      return res.status(200).send(customer)
    } catch (err) {
      console.error(err)
      return res.status(500).send({ error: err.message })
    }
  }

  async search (req, res) {
    const companyToken = req.headers['token']

    try {
      var { companyRepository, templateRepository, businessRepository } = this._getInstanceRepositories(req.app)

      const company = await companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ error: 'Company não identificada.' })

      const search = req.query.search
      var request = await searchCustomer(search, companyToken, company.prefix_index_elastic)
      if (request.response && request.response.status && request.response.status !== 200) return res.status(request.response.status).send(request.response.data)
      var customers = (Array.isArray(request.data)) ? request.data : []

      let customerResultList = []

      for (const i in customers) {
        const customer = customers[i]
        let templateList = customer.business_template_list
        
        const templates = []

        for (const iTemplate in templateList) {
          const templateId = templateList[iTemplate]

          const template = await templateRepository.getById(templateId, companyToken)
          if (template) {
            const templateFinal = { _id: template._id, name: template.name }
            const fieldKey = template.fields.find(f => f.key)
            if (fieldKey) {
              const keyColumn = fieldKey.data

              let keyValue = ''
              if (fieldKey.data === 'customer_cpfcnpj') {
                keyValue = (customer.cpfcnpj) ? customer.cpfcnpj : customer.customer_cpfcnpj
              } else if (fieldKey.data === 'customer_phone' || fieldKey.data === 'customer_phone_number') {
                keyValue = (customer.phone) ? customer.phone[0].number : customer.customer_phome[0].number
              } else if (fieldKey.data === 'customer_email' || fieldKey.data === 'customer_email_address') {
                keyValue = (customer.email) ? customer.email[0].email : customer.customer_email[0].email
              } else if (fieldKey.data === 'customer_name') {
                keyValue = (customer.name) ? customer.name : customer.customer_name
              }

              let templateData = await businessRepository.listAllAndChildsByTemplateAndKeySortedReverse(companyToken, templateId, keyColumn, keyValue)

              if (templateData.length) {
                templateFinal.lote_data_list = templateData
                templates.push(templateFinal)
              }
            }
          }
        }

        const customerResult = {
          id: customer.id,
          customer_name: customer.customer_name,
          customer_cpfcnpj: customer.customer_cpfcnpj,
          customer_phome: customer.customer_phome,
          customer_email: customer.customer_email,
          schema_list: templates
        }

        customerResultList.push(customerResult)
      }

      customerResultList = customerResultList.sort((a, b) => (a.customer_name > b.customer_name) ? 1 : ((b.customer_name > a.customer_name) ? -1 : 0))

      return res.status(200).send(customerResultList)
    } catch (err) {
      console.error(err)
      return res.status(500).send({ error: err.message })
    }
  }
}

module.exports = CustomerController
