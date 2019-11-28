const CustomerController = require('../controllers/customer-controller')

const customerController = new CustomerController()

const customerRoute = (app) => {
  app.post('/api/v1/customers', (req, res) => customerController.create(req, res))
  app.get('/api/v1/customers', (req, res) => customerController.getByCpfCnpj(req, res))
  app.get('/api/v1/customers/search', (req, res) => customerController.search(req, res))
  app.get('/api/v1/customers/:id', (req, res) => customerController.getById(req, res))
  app.get('/api/v1/customers/:id/formatted', (req, res) => customerController.getByIdFormatted(req, res))
  app.put('/api/v1/customers/:id', (req, res) => customerController.update(req, res))
}

module.exports = customerRoute
