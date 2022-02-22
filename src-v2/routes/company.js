import CompanyController from '../controllers/company-controller.js'

const companyController = new CompanyController()

export default function companyRoute(app) {
  app.post('/api/v2/companies', (req, res) => companyController.create(req, res))
  app.get('/api/v2/companies', (req, res) => companyController.getAll(req, res))
  app.get('/api/v2/companies/:id', (req, res) => companyController.getById(req, res))
  app.put('/api/v2/companies/:id', (req, res) => companyController.update(req, res))
}
