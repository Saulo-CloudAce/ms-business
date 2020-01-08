const CustomerController = require('../controllers/customer-controller')

const customerController = new CustomerController()

const customerRoute = (app) => {
  app.post('/api/v2/customers', (req, res) => customerController.create(req, res))
  app.get('/api/v2/customers', (req, res) => customerController.getByCpfCnpj(req, res))
  app.get('/api/v2/customers/search', (req, res) => customerController.search(req, res))
  app.get('/api/v2/customers/:id', (req, res) => customerController.getById(req, res))
  app.get('/api/v2/customers/:id/formatted', (req, res) => customerController.getByIdFormatted(req, res))
  app.put('/api/v2/customers/:id', (req, res) => customerController.update(req, res))
}

module.exports = customerRoute