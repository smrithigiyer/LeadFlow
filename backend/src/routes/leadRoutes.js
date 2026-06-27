const express  = require('express')
const multer   = require('multer')
const { body, query, param } = require('express-validator')

const leadController     = require('../controllers/leadController')
const followUpController = require('../controllers/followUpController')
const noteController     = require('../controllers/notesController')
const emailController    = require('../controllers/emailController')
const validate           = require('../middleware/validate')

const router  = express.Router()
const upload  = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }) // 5 MB

// ── Reusable validators ────────────────────────────────────────────────────
const leadBodyRules = [
  body('name')
    .trim().notEmpty().withMessage('Name is required')
    .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),

  body('email')
    .trim().notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Enter a valid email address')
    .normalizeEmail(),

  body('phone')
    .trim().notEmpty().withMessage('Phone is required')
    .isLength({ max: 20 }).withMessage('Phone cannot exceed 20 characters'),

  body('company')
    .optional().trim()
    .isLength({ max: 100 }).withMessage('Company name cannot exceed 100 characters'),

  body('source')
    .optional()
    .isIn(['website','referral','social_media','cold_call','email_campaign','event','other',''])
    .withMessage('Invalid source'),

  body('status')
    .optional()
    .isIn(['new','contacted','interested','meeting_scheduled','converted','no_response','not_interested','lost'])
    .withMessage('Invalid status'),

  body('assignedTo')
    .optional().trim()
    .isLength({ max: 100 }).withMessage('Assigned name cannot exceed 100 characters'),

  body('notes')
    .optional().trim()
    .isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters'),
]

const objectIdRule = (field) =>
  param(field).isMongoId().withMessage(`Invalid ${field}`)

// ── Stats & Export (before /:id to avoid route conflicts) ─────────────────
router.get('/stats',  leadController.getStats)
router.get('/export', leadController.exportLeads)

// ── Bulk welcome email ─────────────────────────────────────────────────────
router.post('/email/welcome/bulk', emailController.bulkSendWelcome)

// ── Import ─────────────────────────────────────────────────────────────────
router.post(
  '/import',
  upload.single('file'),
  leadController.importLeads
)

// ── CRUD ───────────────────────────────────────────────────────────────────
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1–100'),
    query('status').optional().isIn(['new','contacted','interested','meeting_scheduled','converted','no_response','not_interested','lost']),
    query('sort').optional().isString(),
  ],
  validate,
  leadController.getLeads
)

router.get(
  '/:id',
  [objectIdRule('id')],
  validate,
  leadController.getLeadById
)

router.post(
  '/',
  leadBodyRules,
  validate,
  leadController.createLead
)

router.put(
  '/:id',
  [objectIdRule('id'), ...leadBodyRules],
  validate,
  leadController.updateLead
)

router.patch(
  '/bulk',
  [
    body('ids').isArray({ min: 1 }).withMessage('ids must be a non-empty array'),
    body('ids.*').isMongoId().withMessage('Each id must be a valid MongoDB ObjectId'),
    body('action').isIn(['assign', 'status', 'reactivate', 'delete']).withMessage('action must be assign, status, reactivate, or delete'),
  ],
  validate,
  leadController.bulkAction
)

router.patch(
  '/:id/status',
  [
    objectIdRule('id'),
    body('status')
      .notEmpty().withMessage('Status is required')
      .isIn(['new','contacted','interested','meeting_scheduled','converted','no_response','not_interested','lost'])
      .withMessage('Invalid status'),
  ],
  validate,
  leadController.updateStatus
)

router.delete(
  '/:id',
  [objectIdRule('id')],
  validate,
  leadController.deleteLead
)

router.get(
  '/:leadId/followups',
  [objectIdRule('leadId')],
  validate,
  followUpController.getFollowUpsByLead
)

router.get(
  '/:leadId/notes',
  [objectIdRule('leadId')],
  validate,
  noteController.getNotesByLead
)

router.post(
  '/:leadId/notes',
  [
    objectIdRule('leadId'),
    body('content').trim().notEmpty().withMessage('Content is required')
      .isLength({ max: 500 }).withMessage('Note cannot exceed 500 characters'),
  ],
  validate,
  noteController.createNote
)

router.post(
  '/:leadId/email',
  [
    objectIdRule('leadId'),
    body('to').trim().notEmpty().withMessage('Recipient email is required').isEmail().withMessage('Enter a valid recipient email'),
    body('subject').trim().notEmpty().withMessage('Subject is required').isLength({ max: 200 }).withMessage('Subject cannot exceed 200 characters'),
    body('body').trim().notEmpty().withMessage('Body is required').isLength({ max: 5000 }).withMessage('Body cannot exceed 5000 characters'),
  ],
  validate,
  emailController.sendEmail
)

router.get(
  '/:leadId/email',
  [objectIdRule('leadId')],
  validate,
  emailController.getEmailsByLead
)

router.post(
  '/:leadId/followups',
  [
    objectIdRule('leadId'),
    body('type')
      .optional()
      .isIn(['call','email','meeting','demo','other'])
      .withMessage('Invalid type'),
    body('scheduledAt')
      .notEmpty().withMessage('scheduledAt is required')
      .isISO8601().withMessage('scheduledAt must be a valid date'),
    body('notes').optional().trim().isLength({ max: 1000 }),
  ],
  validate,
  followUpController.createFollowUp
)

module.exports = router
