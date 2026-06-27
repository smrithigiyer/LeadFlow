const express = require('express')
const { body, param } = require('express-validator')

const followUpController = require('../controllers/followUpController')
const noteController     = require('../controllers/notesController')
const validate           = require('../middleware/validate')

const router = express.Router()

const objectIdRule = (field) =>
  param(field).isMongoId().withMessage(`Invalid ${field}`)

// ── GET all follow-ups (with optional filters) ─────────────────────────────
router.get('/', followUpController.getFollowUps)

router.get(
  '/:id',
  [objectIdRule('id')],
  validate,
  followUpController.getFollowUpById
)

// ── PATCH /followups/bulk (must be before /:id routes) ────────────────────
router.patch(
  '/bulk',
  [
    body('ids').isArray({ min: 1 }).withMessage('ids must be a non-empty array'),
    body('ids.*').isMongoId().withMessage('Each id must be a valid MongoDB ObjectId'),
    body('action').isIn(['outcome', 'delete']).withMessage('action must be outcome or delete'),
  ],
  validate,
  followUpController.bulkFollowUp
)

// ── PUT (full update) ──────────────────────────────────────────────────────
router.put(
  '/:id',
  [
    objectIdRule('id'),
    body('type')
      .optional()
      .isIn(['call','email','meeting','demo','other'])
      .withMessage('Invalid type'),
    body('scheduledAt')
      .optional()
      .isISO8601().withMessage('scheduledAt must be a valid date'),
    body('outcome')
      .optional()
      .isIn(['pending','completed','no_answer','rescheduled','cancelled'])
      .withMessage('Invalid outcome'),
    body('notes').optional().trim().isLength({ max: 1000 }),
  ],
  validate,
  followUpController.updateFollowUp
)

// ── PATCH outcome only ─────────────────────────────────────────────────────
router.patch(
  '/:id/outcome',
  [
    objectIdRule('id'),
    body('outcome')
      .notEmpty().withMessage('Outcome is required')
      .isIn(['pending','completed','no_answer','rescheduled','cancelled'])
      .withMessage('Invalid outcome'),
  ],
  validate,
  followUpController.updateOutcome
)

// ── DELETE (soft) ──────────────────────────────────────────────────────────
router.delete(
  '/:id',
  [objectIdRule('id')],
  validate,
  followUpController.deleteFollowUp
)

// ── Notes for a follow-up ──────────────────────────────────────────────────
router.get(
  '/:followupId/notes',
  [objectIdRule('followupId')],
  validate,
  noteController.getNotesByFollowup
)

router.post(
  '/:followupId/notes',
  [
    objectIdRule('followupId'),
    body('content').trim().notEmpty().withMessage('Content is required')
      .isLength({ max: 500 }).withMessage('Note cannot exceed 500 characters'),
  ],
  validate,
  noteController.createFollowUpNote
)

module.exports = router
