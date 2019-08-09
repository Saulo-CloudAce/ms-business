const BusinessController = require('../controllers/business-controller')

const businessController = new BusinessController(null)

const businessRoute = (app) => {
  app.post('/api/v1/business', (req, res) => businessController.create(req, res))
  app.post('/api/v1/business_json', (req, res) => businessController.createFromJson(req, res))
  app.get('/api/v1/business', (req, res) => businessController.getAll(req, res))
  app.get('/api/v1/business/:id', (req, res) => businessController.getByIdWithData(req, res))
}

module.exports = businessRoute
