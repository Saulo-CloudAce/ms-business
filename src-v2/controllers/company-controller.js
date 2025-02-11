import CompanyRepository from '../repository/company-repository.js'
import Company from '../../domain-v2/company.js'
export default class CompanyController {
  async create(req, res) {
    try {
      const companyRepository = new CompanyRepository(req.app.locals.db)
      const company = new Company(companyRepository)

      const companies = await company.getAll()
      if (companies && companies.length > 0) {
        let comp = companies.filter((c) => c.name === req.body.name)
        if (comp && comp.length > 0) return res.status(400).send({ error: 'Já existe uma company com este nome.' })
        comp = companies.filter((c) => c.prefix_index_elastic === req.body.prefix_index_elastic)
        if (comp && comp.length > 0) return res.status(400).send({ error: 'Já existe uma company com este prefix index elastic nome.' })
      }

      const newCompany = await company.create(req.body.name, req.body.prefix_index_elastic, req.body.callback)

      return res.status(201).send(newCompany)
    } catch (err) {
      console.error(err)
      return res.status(500).send({ error: err.message })
    }
  }

  async getAll(req, res) {
    try {
      const companyRepository = new CompanyRepository(req.app.locals.db)
      const company = new Company(companyRepository)

      const companies = await company.getAll()

      return res.status(200).send(companies)
    } catch (err) {
      return res.status(500).send({ error: err.message })
    }
  }

  async getById(req, res) {
    try {
      const companyRepository = new CompanyRepository(req.app.locals.db)
      const company = new Company(companyRepository)

      const c = await company.getById(req.params.id)

      return res.status(200).send(c)
    } catch (err) {
      return res.status(500).send({ error: err.message })
    }
  }

  async update(req, res) {
    try {
      const companyRepository = new CompanyRepository(req.app.locals.db)
      const company = new Company(companyRepository)

      await company.update(req.params.id, req.body.name, req.body.callback, req.body.activated)

      return res.sendStatus(204)
    } catch (err) {
      return res.status(500).send({ error: err.message })
    }
  }
}
