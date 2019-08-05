const CompanyRepository = require('../repository/company-repository')
const Company = require('../../domain/company')
const mongodb = require('../../config/mongodb')

const companyRepository = new CompanyRepository(mongodb)
const company = new Company(companyRepository)

class CompanyController {
  async create (req, res) {
    req.assert('name', 'O nome é obrigatório').notEmpty()
    req.assert('callback', 'A URL de callback é obrigatória').notEmpty()

    if (req.validationErrors()) return res.status(400).send({ errors: req.validationErrors() })

    try {
      const newCompany = await company.create(req.body.name, req.body.callback)

      return res.status(201).send(newCompany)
    } catch (err) {
      return res.status(500).send({ err: err.message })
    }
  }

  async getAll (req, res) {
    try {
      const companies = await company.getAll()

      return res.status(200).send(companies)
    } catch (err) {
      return res.status(500).send({ err: err.message })
    }
  }

  async getById (req, res) {
    try {
      const c = await company.getById(req.params.id)

      return res.status(200).send(c)
    } catch (err) {
      return res.status(500).send({ err: err.message })
    }
  }

  async update (req, res) {
    req.assert('name', 'O nome é obrigatório').notEmpty()
    req.assert('callback', 'A URL de callback é obrigatória').notEmpty()
    req.assert('activated', 'O activated é obrigatório').notEmpty()

    if (req.validationErrors()) return res.status(400).send({ errors: req.validationErrors() })

    try {
      const companyUpdated = await company.update(req.params.id, req.body.name, req.body.callback, req.body.activated)

      return res.status(201).send(companyUpdated)
    } catch (err) {
      return res.status(500).send({ err: err.message })
    }
  }

}

module.exports = CompanyController
