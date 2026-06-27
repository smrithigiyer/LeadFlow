const express  = require('express')
const router   = express.Router()
const {
  getLostLeads,
  getLostStats,
  reactivateLead,
  updateLostInfo,
} = require('../controllers/lostLeadsController')

router.get('/stats',               getLostStats)
router.get('/',                    getLostLeads)
router.patch('/:id/info',          updateLostInfo)
router.patch('/:id/reactivate',    reactivateLead)

module.exports = router
