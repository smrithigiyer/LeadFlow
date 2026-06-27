const express          = require('express')
const leadRoutes       = require('./leadRoutes')
const followUpRoutes   = require('./followUpRoutes')
const publicRoutes     = require('./publicRoutes')
const authRoutes       = require('./authRoutes')
const userRoutes       = require('./userRoutes')
const activityRoutes   = require('./activityRoutes')
const customerRoutes   = require('./customerRoutes')
const lostLeadsRoutes  = require('./lostLeadsRoutes')
const noteRoutes       = require('./noteRoutes')
const { protect }      = require('../middleware/auth')

const router = express.Router()

// Public endpoints (no auth)
router.use('/public', publicRoutes)
router.use('/auth',   authRoutes)

// Health check (public)
router.get('/health', (_req, res) => {
  res.json({ success: true, message: 'API is running', timestamp: new Date().toISOString() })
})

// Protected endpoints
router.use('/leads',      protect, leadRoutes)
router.use('/followups',  protect, followUpRoutes)
router.use('/users',      protect, userRoutes)
router.use('/customers',  protect, customerRoutes)
router.use('/lost-leads', protect, lostLeadsRoutes)
router.use('/notes',      protect, noteRoutes)
router.use('/',           protect, activityRoutes)

module.exports = router
