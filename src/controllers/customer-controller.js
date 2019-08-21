const mongodb = require('../../config/mongodb')
const {
  createSingleCustomer,
  getByCpfCnpj,
  getAllCustomersByCompany,
  searchCustomer,
  updateCustomer } = require('../services/crm-service')
const CompanyRepository = require('../repository/company-repository')
const TemplateRepository = require('../repository/template-repository')
const BusinessRepository = require('../repository/business-repository')

class CustomerController {
  constructor () {
    this.companyRepository = new CompanyRepository(mongodb)
    this.templateRepository = new TemplateRepository(mongodb)
    this.businessRepository = new BusinessRepository(mongodb)
  }

  async create (req, res) {
    req.assert('customer_cpfcnpj', 'O CPF/CNPJ é obrigatório').notEmpty()

    if (req.validationErrors()) return res.status(400).send({ errors: req.validationErrors() })

    const companyToken = req.headers['token']

    try {
      const company = await this.companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ err: 'Company não identificada.' })

      var cpfcnpj = req.body.customer_cpfcnpj
      cpfcnpj = cpfcnpj.replace(/\./g, '')
      cpfcnpj = cpfcnpj.replace(/-/g, '')
      cpfcnpj = cpfcnpj.replace(/\\/g, '')
      req.body.customer_cpfcnpj = cpfcnpj

      const request = await createSingleCustomer(req.body, companyToken)
      if (request.response && request.response.status && request.response.status != 200) return res.status(request.response.status).send(request.response.data)
      return res.status(201).send(request.data)
    } catch (err) {
      return res.status(500).send({ err: err.message })
    }
  }

  async update (req, res) {
    req.assert('customer_cpfcnpj', 'O CPF/CNPJ é obrigatório').notEmpty()

    if (req.validationErrors()) return res.status(400).send({ errors: req.validationErrors() })

    const companyToken = req.headers['token']

    try {
      const company = await this.companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ err: 'Company não identificada.' })

      var cpfcnpj = req.body.customer_cpfcnpj
      cpfcnpj = cpfcnpj.replace(/\./g, '')
      cpfcnpj = cpfcnpj.replace(/-/g, '')
      cpfcnpj = cpfcnpj.replace(/\\/g, '')
      req.body.customer_cpfcnpj = cpfcnpj

      const request = await updateCustomer(req.params.id, req.body, companyToken)
      if (request.response && request.response.status && request.response.status != 200) return res.status(request.response.status).send(request.response.data)
      return res.status(200).send(request.data)
    } catch (err) {
      return res.status(500).send({ err: err.message })
    }
  }

  async getByCpfCnpj (req, res) {
    const companyToken = req.headers['token']

    try {
      const company = await this.companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ err: 'Company não identificada.' })

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

      if (request.response && request.response.status && request.response.status != 200) return res.status(request.response.status).send(request.response.data)

      let customer = request.data
      var templateList = customer.business_template_list
      var templates = []
      if (templateList && templateList.length > 0) {
        templates = await Promise.all(templateList.map(async templateId => {
          var template = await this.templateRepository.getNameById(templateId, companyToken)
          if (template) {
            var data = await this.businessRepository.getAllByTemplate(companyToken, templateId)
            if (data && data.length > 0) {
              data.map(m => {
                m.data = m.data.filter(md => md.customer_cpfcnpj === cpfcnpj)
              })
            }
            template.lote_data_list = data
            return template
          }
        }))
      }

      customer.schema_list = templates.filter(t => t)
      delete customer.business_list
      delete customer.business_template_list

      return res.status(200).send(customer)
    } catch (err) {
      return res.status(500).send({ err: err.message })
    }
  }

  async search (req, res) {
    const companyToken = req.headers['token']

    try {
      const company = await this.companyRepository.getByToken(companyToken)
      if (!company) return res.status(400).send({ err: 'Company não identificada.' })

      const search = req.query.search
      var request = await searchCustomer(search, companyToken)
      if (request.response && request.response.status && request.response.status != 200) return res.status(request.response.status).send(request.response.data)

      return res.status(200).send(request.data)
    } catch (err) {
      return res.status(500).send({ err: err.message })
    }
  }
}

module.exports = CustomerController
