const User   = require('../models/User')
const { successResponse, errorResponse } = require('../utils/apiResponse')
const logger = require('../utils/logger')

const safeUser = (u) => ({
  _id:         u._id,
  name:        u.name,
  email:       u.email,
  role:        u.role,
  phone:       u.phone       || '',
  department:  u.department  || '',
  isActive:    u.isActive,
  lastLoginAt: u.lastLoginAt || null,
  createdAt:   u.createdAt,
})

// ── GET /users ─────────────────────────────────────────────────────────────
exports.getUsers = async (_req, res, next) => {
  try {
    const users = await User.find().sort('-createdAt').lean()
    successResponse(res, 200, 'Users fetched', users.map(safeUser))
  } catch (err) {
    next(err)
  }
}

// ── GET /users/:id ─────────────────────────────────────────────────────────
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).lean()
    if (!user) return errorResponse(res, 404, 'User not found')
    successResponse(res, 200, 'User fetched', safeUser(user))
  } catch (err) {
    next(err)
  }
}

// ── POST /users  (create team member) ─────────────────────────────────────
exports.createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, department } = req.body

    const exists = await User.findOne({ email })
    if (exists) return errorResponse(res, 409, 'Email is already registered')

    const user = await User.create({
      name, email, password,
      role:       role       || 'staff',
      phone:      phone      || '',
      department: department || '',
    })
    logger.info(`User created: ${user._id} (${user.email}) role=${user.role}`)
    successResponse(res, 201, 'User created successfully', safeUser(user))
  } catch (err) {
    next(err)
  }
}

// ── PUT /users/:id  (update name / role / phone / department) ─────────────
exports.updateUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user._id.toString() && req.body.role && req.body.role !== req.user.role) {
      return errorResponse(res, 400, 'You cannot change your own role')
    }

    const allowed = {}
    if (req.body.name       !== undefined) allowed.name       = req.body.name
    if (req.body.role       !== undefined) allowed.role       = req.body.role
    if (req.body.phone      !== undefined) allowed.phone      = req.body.phone
    if (req.body.department !== undefined) allowed.department = req.body.department

    const user = await User.findByIdAndUpdate(req.params.id, allowed, { new: true, runValidators: true })
    if (!user) return errorResponse(res, 404, 'User not found')

    logger.info(`User updated: ${user._id}`)
    successResponse(res, 200, 'User updated successfully', safeUser(user))
  } catch (err) {
    next(err)
  }
}

// ── PATCH /users/:id/status  (activate / deactivate) ──────────────────────
exports.toggleStatus = async (req, res, next) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return errorResponse(res, 400, 'You cannot deactivate your own account')
    }

    const user = await User.findById(req.params.id)
    if (!user) return errorResponse(res, 404, 'User not found')

    user.isActive = !user.isActive
    await user.save()

    logger.info(`User ${user.isActive ? 'activated' : 'deactivated'}: ${user._id}`)
    successResponse(res, 200, `User ${user.isActive ? 'activated' : 'deactivated'}`, {
      _id:      user._id,
      isActive: user.isActive,
    })
  } catch (err) {
    next(err)
  }
}

// ── DELETE /users/:id ──────────────────────────────────────────────────────
exports.deleteUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return errorResponse(res, 400, 'You cannot delete your own account')
    }

    const user = await User.findByIdAndDelete(req.params.id)
    if (!user) return errorResponse(res, 404, 'User not found')

    logger.info(`User deleted: ${user._id} (${user.email})`)
    successResponse(res, 200, 'User deleted successfully')
  } catch (err) {
    next(err)
  }
}
