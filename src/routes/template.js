const TemplateController = require('../controllers/template-controller')

const templateController = new TemplateController()

const templateRoute = (app) => {
  app.post('/api/v1/templates', (req, res) => templateController.create(req, res))
  app.get('/api/v1/templates', (req, res) => templateController.getAll(req, res))
  app.get('/api/v1/templates/:id', (req, res) => templateController.getById(req, res))
  app.get('/api/v1/templates/:id/data', (req, res) => templateController.getDataByTemplateId(req, res))
  app.put('/api/v1/templates/:id/activate', (req, res) => templateController.activateTemplate(req, res))
  app.put('/api/v1/templates/:id/deactivate', (req, res) => templateController.deactivateTemplate(req, res))
}

module.exports = templateRoute
