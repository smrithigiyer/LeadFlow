const express = require('express')
const { body, param } = require('express-validator')
const noteController = require('../controllers/notesController')
const validate = require('../middleware/validate')

const router = express.Router()
const objectIdRule = (f) => param(f).isMongoId().withMessage(`Invalid ${f}`)

router.put(
  '/:id',
  [
    objectIdRule('id'),
    body('content').trim().notEmpty().withMessage('Content is required')
      .isLength({ max: 500 }).withMessage('Note cannot exceed 500 characters'),
  ],
  validate,
  noteController.updateNote
)

router.delete(
  '/:id',
  [objectIdRule('id')],
  validate,
  noteController.deleteNote
)

module.exports = router
