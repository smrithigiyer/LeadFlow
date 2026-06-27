const express  = require('express')
const { param } = require('express-validator')
const activityController = require('../controllers/activityController')
const validate = require('../middleware/validate')

const router = express.Router({ mergeParams: true })

router.get(
  '/leads/:id/activities',
  [param('id').isMongoId().withMessage('Invalid lead id')],
  validate,
  activityController.getActivitiesByLead
)

module.exports = router
