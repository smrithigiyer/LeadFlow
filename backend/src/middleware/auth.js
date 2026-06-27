const jwt  = require('jsonwebtoken')
const User = require('../models/User')
const { errorResponse } = require('../utils/apiResponse')

// Verify JWT and attach user to req.user
exports.protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization
    if (!header || !header.startsWith('Bearer ')) {
      return errorResponse(res, 401, 'Not authenticated. Please login.')
    }

    const token = header.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    const user = await User.findById(decoded.id).select('-password')
    if (!user || !user.isActive) {
      return errorResponse(res, 401, 'User not found or account deactivated.')
    }

    req.user = user
    next()
  } catch (err) {
    return errorResponse(res, 401, 'Invalid or expired token. Please login again.')
  }
}

// Restrict to certain roles: authorize('admin') or authorize('admin', 'staff')
exports.authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return errorResponse(res, 403, `Access denied. Requires role: ${roles.join(' or ')}`)
  }
  next()
}
