const TemplateController = require('../controllers/template-controller')

const templateController = new TemplateController()

const templateRoute = (app) => {
  app.post('/api/v2/templates', (req, res) => templateController.create(req, res))
  app.get('/api/v2/templates', (req, res) => templateController.getAll(req, res))
  app.get('/api/v2/templates/:id', (req, res) => templateController.getById(req, res))
  app.get('/api/v2/templates/:id/data', (req, res) => templateController.getDataByTemplateId(req, res))
  app.put('/api/v2/templates/:id/activate', (req, res) => templateController.activateTemplate(req, res))
  app.put('/api/v2/templates/:id/deactivate', (req, res) => templateController.deactivateTemplate(req, res))
  app.put('/api/v2/templates/:id', (req, res) => templateController.update(req, res))
}

module.exports = templateRoute