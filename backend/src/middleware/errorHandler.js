const logger          = require('../utils/logger')
const { errorResponse } = require('../utils/apiResponse')

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  logger.error(`${err.name}: ${err.message}`, { stack: err.stack, url: req.originalUrl })

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return errorResponse(res, 400, `Invalid ${err.path}: ${err.value}`)
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0]
    return errorResponse(res, 409, `Duplicate value for field: ${field}`)
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).reduce((acc, e) => {
      acc[e.path] = e.message
      return acc
    }, {})
    return errorResponse(res, 422, 'Validation failed', errors)
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return errorResponse(res, 401, 'Invalid token')
  }
  if (err.name === 'TokenExpiredError') {
    return errorResponse(res, 401, 'Token expired')
  }

  // Generic
  const statusCode = err.statusCode || 500
  const message    = err.isOperational ? err.message : 'Something went wrong'
  return errorResponse(res, statusCode, message)
}

module.exports = errorHandler
