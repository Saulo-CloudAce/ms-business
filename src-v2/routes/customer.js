import { checkSchema } from 'express-validator'

import CustomerController from '../controllers/customer-controller.js'
import { createSpec, updateSpec } from './req-schemas/customer.js'
import { applyRules } from '../middlewares/validate-request.js'

const customerController = new CustomerController()

export default function customerRoute(app) {
  app.post('/api/v2/customers', checkSchema(createSpec), applyRules, (req, res) => customerController.create(req, res))
  app.get('/api/v2/customers', (req, res) => customerController.getByCpfCnpj(req, res))
  app.get('/api/v2/customers/info', (req, res) => customerController.getCustomerInfoByCpfCnpj(req, res))
  app.post('/api/v2/customers/pool_info', (req, res) => customerController.getCustomerPoolInfoByCpfCnpj(req, res))
  app.get('/api/v2/customers/paginated', (req, res) => customerController.getAllByCompanyPaginated(req, res))
  app.get('/api/v2/customers/search', (req, res) => customerController.search(req, res))
  app.get('/api/v2/customers/search/paginated', (req, res) => customerController.searchPaginated(req, res))
  app.get('/api/v2/customers/:id', (req, res) => customerController.getById(req, res))
  app.get('/api/v2/customers/:id/formatted', (req, res) => customerController.getByIdFormatted(req, res))
  app.get('/api/v2/customers/:id/template/:templateId', (req, res) => customerController.getByIdAndTemplateId(req, res))
  app.get('/api/v2/customers/:id/template/:templateId/formatted', (req, res) => customerController.getByIdAndTemplateIdFormatted(req, res))
  app.put('/api/v2/customers/:id', checkSchema(updateSpec), applyRules, (req, res) => customerController.update(req, res))
}
