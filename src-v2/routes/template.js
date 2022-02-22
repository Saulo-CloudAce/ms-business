import TemplateController from '../controllers/template-controller.js'

const templateController = new TemplateController()

export default function templateRoute(app) {
  app.post('/api/v2/templates', (req, res) => templateController.create(req, res))
  app.get('/api/v2/templates', (req, res) => templateController.getAll(req, res))
  app.get('/api/v2/templates/:id', (req, res) => templateController.getById(req, res))
  // app.get("/api/v2/templates/:id/data", (req, res) =>
  //   templateController.getDataByTemplateId(req, res)
  // );
  app.post('/api/v2/templates/:id/data/paginated', (req, res) => templateController.filterDataByTemplateIdWithPagination(req, res))
  app.post('/api/v2/templates/:id/data/export', (req, res) => templateController.exportFilteredDataByTemplateId(req, res))
  app.get('/api/v2/templates/:id/data_export', (req, res) => templateController.exportDataByTemplateId(req, res))
  app.put('/api/v2/templates/:id/activate', (req, res) => templateController.activateTemplate(req, res))
  app.put('/api/v2/templates/:id/deactivate', (req, res) => templateController.deactivateTemplate(req, res))
  app.put('/api/v2/templates/:id', (req, res) => templateController.update(req, res))
}
