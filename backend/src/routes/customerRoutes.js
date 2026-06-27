const express  = require('express')
const router   = express.Router()
const {
  getCustomers,
  getCustomerStats,
  getCustomerById,
  updateCustomer,
} = require('../controllers/customerController')

router.get('/stats',   getCustomerStats)
router.get('/',        getCustomers)
router.get('/:id',     getCustomerById)
router.patch('/:id',   updateCustomer)

module.exports = router
