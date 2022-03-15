import { checkSchema } from 'express-validator'

import TemplateController from '../controllers/template-controller.js'
import { createSpec, updateSpec } from './req-schemas/template.js'

import { applyRules } from '../middlewares/validate-request.js'

const templateController = new TemplateController()

export default function templateRoute(app) {
  app.post('/api/v2/templates', checkSchema(createSpec), applyRules, (req, res) => templateController.create(req, res))
  app.get('/api/v2/templates', (req, res) => templateController.getAll(req, res))
  app.get('/api/v2/templates/:id', (req, res) => templateController.getById(req, res))
  app.get('/api/v2/templates/:id/without_tags', (req, res) => templateController.getByIdWithoutTags(req, res))

  app.post('/api/v2/templates/:id/data/paginated', (req, res) => templateController.filterDataByTemplateIdWithPagination(req, res))
  app.post('/api/v2/templates/:id/data/export', (req, res) => templateController.exportFilteredDataByTemplateId(req, res))
  app.get('/api/v2/templates/:id/data_export', (req, res) => templateController.exportDataByTemplateId(req, res))
  app.put('/api/v2/templates/:id/activate', (req, res) => templateController.activateTemplate(req, res))
  app.put('/api/v2/templates/:id/deactivate', (req, res) => templateController.deactivateTemplate(req, res))
  app.put('/api/v2/templates/:id', checkSchema(updateSpec), applyRules, (req, res) => templateController.update(req, res))
}
