const express = require('express')
const { body, param } = require('express-validator')

const userController       = require('../controllers/userController')
const { authorize }        = require('../middleware/auth')
const validate             = require('../middleware/validate')

const router = express.Router()

const objectIdRule = (field) =>
  param(field).isMongoId().withMessage(`Invalid ${field}`)

const userBodyRules = [
  body('name').trim().notEmpty().withMessage('Name is required')
    .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),
  body('email').trim().isEmail().withMessage('Enter a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['admin', 'staff']).withMessage('Invalid role'),
]

// All user routes require admin role (protect already applied in index.js)
router.use(authorize('admin'))

router.get('/',    userController.getUsers)

router.get(
  '/:id',
  [objectIdRule('id')],
  validate,
  userController.getUserById
)

router.post(
  '/',
  userBodyRules,
  validate,
  userController.createUser
)

router.put(
  '/:id',
  [
    objectIdRule('id'),
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty').isLength({ max: 100 }),
    body('role').optional().isIn(['admin', 'staff']).withMessage('Invalid role'),
    body('phone').optional({ checkFalsy: true }).trim().isLength({ max: 20 }),
    body('department').optional({ checkFalsy: true }).trim()
      .isIn(['Sales','Marketing','Support','Operations','Management','Other','']).withMessage('Invalid department'),
  ],
  validate,
  userController.updateUser
)

router.patch(
  '/:id/status',
  [objectIdRule('id')],
  validate,
  userController.toggleStatus
)

router.delete(
  '/:id',
  [objectIdRule('id')],
  validate,
  userController.deleteUser
)

module.exports = router
