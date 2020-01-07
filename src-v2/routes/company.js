const CompanyController = require('../controllers/company-controller')

const companyController = new CompanyController()

const companyRoute = (app) => {
  app.post('/api/v2/companies', (req, res) => companyController.create(req, res))
  app.get('/api/v2/companies', (req, res) => companyController.getAll(req, res))
  app.get('/api/v2/companies/:id', (req, res) => companyController.getById(req, res))
  app.put('/api/v2/companies/:id', (req, res) => companyController.update(req, res))
}

module.exports = companyRoute
