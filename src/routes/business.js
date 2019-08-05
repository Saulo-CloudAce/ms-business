const BusinessController = require('../controllers/business-controller')

const businessController = new BusinessController(null)

const businessRoute = (app) => {
  app.post('/api/v1/business', (req, res) => businessController.create(req, res))
  app.get('/api/v1/business', (req, res) => businessController.getAll(req, res))
  app.get('/api/v1/business/:id', (req, res) => businessController.getById(req, res))
}

module.exports = businessRoute
