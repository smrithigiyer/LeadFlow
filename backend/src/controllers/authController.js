const jwt  = require('jsonwebtoken')
const User = require('../models/User')
const { successResponse, errorResponse } = require('../utils/apiResponse')
const logger = require('../utils/logger')

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  })

const safeUser = (u) => ({
  _id:         u._id,
  name:        u.name,
  email:       u.email,
  role:        u.role,
  phone:       u.phone       || '',
  department:  u.department  || '',
  lastLoginAt: u.lastLoginAt || null,
  createdAt:   u.createdAt   || null,
})

// POST /auth/login
exports.login = async (req, res, next) => {
  try {
    let { email, password } = req.body

    if (!email || !password) {
      return errorResponse(res, 400, 'Email and password are required')
    }

    // Normalize email to match how it is stored in DB (lowercased)
    email = String(email).trim().toLowerCase()

    const user = await User.findOne({ email }).select('+password')
    if (!user) {
      logger.warn(`Login failed: user not found (email=${email})`)
      return errorResponse(res, 401, 'Invalid credentials')
    }
    if (!user.isActive) {
      logger.warn(`Login blocked: user deactivated (userId=${user._id}, email=${email})`)
      return errorResponse(res, 403, 'This user/profile is deactivated, please contact admin to activate!!')
    }

    const match = await user.comparePassword(password)
    if (!match) {
      logger.warn(`Login failed: password mismatch (userId=${user._id}, email=${email})`)
      return errorResponse(res, 401, 'Invalid credentials')
    }

    user.lastLoginAt = new Date()
    await user.save({ validateBeforeSave: false })

    const token = signToken(user._id)
    logger.info(`User logged in: ${user._id} (${user.email})`)

    successResponse(res, 200, 'Login successful', { token, user: safeUser(user) })
  } catch (err) {
    next(err)
  }
}

// GET /auth/me
exports.getMe = async (req, res) => {
  successResponse(res, 200, 'User fetched', safeUser(req.user))
}

// PATCH /auth/profile  (logged-in user updates own profile)
exports.updateProfile = async (req, res, next) => {
  try {
    const allowed = {}
    if (req.body.name       !== undefined) allowed.name       = req.body.name
    if (req.body.phone      !== undefined) allowed.phone      = req.body.phone
    if (req.body.department !== undefined) allowed.department = req.body.department

    const user = await User.findByIdAndUpdate(
      req.user._id,
      allowed,
      { new: true, runValidators: true }
    )

    logger.info(`Profile updated: ${user._id}`)
    successResponse(res, 200, 'Profile updated', safeUser(user))
  } catch (err) {
    next(err)
  }
}

// PATCH /auth/change-password  (logged-in user changes own password)
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return errorResponse(res, 400, 'currentPassword and newPassword are required')
    }
    if (newPassword.length < 6) {
      return errorResponse(res, 400, 'New password must be at least 6 characters')
    }

    const user = await User.findById(req.user._id).select('+password')
    const match = await user.comparePassword(currentPassword)
    if (!match) {
      return errorResponse(res, 401, 'Current password is incorrect')
    }

    user.password = newPassword
    await user.save()

    logger.info(`Password changed: ${user._id}`)
    successResponse(res, 200, 'Password changed successfully')
  } catch (err) {
    next(err)
  }
}

// POST /auth/register  (admin-only — creates staff/admin accounts)
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body

    const exists = await User.findOne({ email })
    if (exists) return errorResponse(res, 409, 'Email already in use')

    const user = await User.create({ name, email, password, role: role || 'staff' })
    logger.info(`User registered: ${user._id} (${user.email}) role=${user.role}`)

    successResponse(res, 201, 'User created', safeUser(user))
  } catch (err) {
    next(err)
  }
}
