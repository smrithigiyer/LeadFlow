const { errorResponse } = require('../utils/apiResponse')

const notFound = (req, res) => {
  errorResponse(res, 404, `Route not found: ${req.method} ${req.originalUrl}`)
}

module.exports = notFound
