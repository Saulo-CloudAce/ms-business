import { checkSchema } from 'express-validator'
import { applyRules } from '../middlewares/validate-request.js'

import CompanyController from '../controllers/company-controller.js'
import { createSpec, updateSpec } from './req-schemas/company.js'

const companyController = new CompanyController()

export default function companyRoute(app) {
  app.post('/api/v2/companies', checkSchema(createSpec), applyRules, companyController.create)
  app.get('/api/v2/companies', companyController.getAll)
  app.get('/api/v2/companies/:id', companyController.getById)
  app.put('/api/v2/companies/:id', checkSchema(updateSpec), applyRules, companyController.update)
}
