const BusinessController = require('../controllers/business-controller')

const businessController = new BusinessController(null)

const businessRoute = (app) => {
    app.post('/api/v1/business', (req, res) => businessController.create(req, res))
}

module.exports = businessRoute