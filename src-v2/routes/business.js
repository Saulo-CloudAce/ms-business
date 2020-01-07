const multiparty = require('connect-multiparty')
const BusinessController = require('../controllers/business-controller')

const multipartyMiddleware = multiparty()
const businessController = new BusinessController(null)

const businessRoute = (app) => {
  app.post('/api/v2/business', multipartyMiddleware, (req, res) => businessController.create(req, res))
  app.post('/api/v2/business_url_file', multipartyMiddleware, (req, res) => businessController.createFromUrlFile(req, res))
  app.post('/api/v2/business_json', (req, res) => businessController.createFromJson(req, res))
  app.post('/api/v2/business_single_register', (req, res) => businessController.createSingleRegisterBusiness(req, res))
  app.get('/api/v2/business', (req, res) => businessController.getAll(req, res))
  app.get('/api/v2/business/search', (req, res) => businessController.getBusinessAndRegisterIdByCpf(req, res))
  app.post('/api/v2/business/get_pool_data', (req, res) => businessController.getPoolData(req, res))
  app.get('/api/v2/business/:id', (req, res) => businessController.getByIdWithData(req, res))
  app.get('/api/v2/business/:businessId/data/:registerId', (req, res) => businessController.getBusinessRegisterById(req, res))
  app.put('/api/v2/business/:id/activate', (req, res) => businessController.activateBusiness(req, res))
  app.put('/api/v2/business/:id/deactivate', (req, res) => businessController.deactivateBusiness(req, res))
  app.put('/api/v2/business/:id/mark_flow_passed', (req, res) => businessController.markBusinessFlowPassed(req, res))
  app.put('/api/v2/business/:id/unmark_flow_passed', (req, res) => businessController.unmarkBusinessFlowPassed(req, res))
  app.put('/api/v2/business/:businessId/data/:registerId', (req, res) => businessController.updateBusinessRegisterById(req, res))
  app.post('/api/v2/business/full_search', (req, res) => businessController.searchDataInBusiness(req, res))
}

module.exports = businessRoute
