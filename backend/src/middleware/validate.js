const { validationResult } = require('express-validator')
const { errorResponse }    = require('../utils/apiResponse')

/**
 * Middleware: collect express-validator errors and short-circuit with 422.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const formatted = errors.array().reduce((acc, err) => {
      acc[err.path] = err.msg
      return acc
    }, {})
    return errorResponse(res, 422, 'Validation failed', formatted)
  }
  next()
}

module.exports = validate
