import { validationResult } from 'express-validator'

export function applyRules(req, res, next) {
  const validationErrors = validationResult(req)

  if (!validationErrors.isEmpty()) {
    return res.status(400).send({ errors: validationErrors.array() })
  }

  next()
}
