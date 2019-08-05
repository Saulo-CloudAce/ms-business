const CompanyController = require('../controllers/company-controller')

const companyController = new CompanyController()

const companyRoute = (app) => {
  app.post('/api/v1/companies', (req, res) => companyController.create(req, res))
  app.get('/api/v1/companies', (req, res) => companyController.getAll(req, res))
  app.get('/api/v1/companies/:id', (req, res) => companyController.getById(req, res))
  app.put('/api/v1/companies/:id', (req, res) => companyController.update(req, res))
}

module.exports = companyRoute
