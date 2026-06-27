const express = require('express')
const { body } = require('express-validator')
const rateLimit = require('express-rate-limit')

const { createPublicLead, createMeetingRequest } = require('../controllers/leadController')
const validate = require('../middleware/validate')

const router = express.Router()

// Throttle: max 10 submissions per IP per 15 minutes
const enquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many submissions. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
})

router.post(
  '/leads',
  enquiryLimiter,
  [
    body('name')
      .trim().notEmpty().withMessage('Name is required')
      .isLength({ max: 100 }).withMessage('Name too long'),

    body('email')
      .trim().notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Enter a valid email')
      .normalizeEmail(),

    body('phone')
      .trim().notEmpty().withMessage('Phone number is required')
      .isLength({ max: 20 }).withMessage('Phone too long'),

    body('message')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 500 }).withMessage('Message too long'),
  ],
  validate,
  createPublicLead
)

router.post(
  '/meeting',
  enquiryLimiter,
  [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
    body('email').trim().notEmpty().withMessage('Email is required').isEmail().normalizeEmail(),
    body('phone').optional({ checkFalsy: true }).trim().isLength({ max: 20 }),
    body('company').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
    body('preferredDate').optional({ checkFalsy: true }).trim().isISO8601().withMessage('Invalid date'),
    body('preferredTime').optional({ checkFalsy: true }).trim().isLength({ max: 20 }),
    body('message').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
  ],
  validate,
  createMeetingRequest
)

module.exports = router