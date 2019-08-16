const mongodb = require('../../config/mongodb')
const {
  createSingleCustomer,
  getByCpfCnpj,
  getAllCustomersByCompany,
  updateCustomer } = require('../services/crm-service')
const CompanyRepository = require('../repository/company-repository')


class CustomerController {
  constructor () {
    this.companyRepository = new CompanyRepository(mongodb)
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
      return res.status(200).send(request.data)
    } catch (err) {
      return res.status(500).send({ err: err.message })
    }
  }
}

module.exports = CustomerController
