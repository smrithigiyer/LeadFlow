const express = require('express')
const { body } = require('express-validator')

const authController = require('../controllers/authController')
const { protect, authorize } = require('../middleware/auth')
const validate = require('../middleware/validate')

const router = express.Router()

// POST /auth/login
router.post(
  '/login',
  [
    body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Enter a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  authController.login
)

// GET /auth/me  (requires login)
router.get('/me', protect, authController.getMe)

// PATCH /auth/profile  (logged-in user updates own name/phone/department)
router.patch(
  '/profile',
  protect,
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty').isLength({ max: 100 }),
    body('phone').optional({ checkFalsy: true }).trim().isLength({ max: 20 }),
    body('department').optional({ checkFalsy: true }).trim()
      .isIn(['Sales','Marketing','Support','Operations','Management','Other','']).withMessage('Invalid department'),
  ],
  validate,
  authController.updateProfile
)

// PATCH /auth/change-password  (logged-in user changes own password)
router.patch(
  '/change-password',
  protect,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  ],
  validate,
  authController.changePassword
)

// POST /auth/register  (admin only — add team members)
router.post(
  '/register',
  protect,
  authorize('admin'),
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').trim().isEmail().withMessage('Enter a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').optional().isIn(['admin', 'staff']).withMessage('Invalid role'),
  ],
  validate,
  authController.register
)

module.exports = router
