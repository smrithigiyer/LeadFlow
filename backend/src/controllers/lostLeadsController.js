const Lead                  = require('../models/Lead')
const { successResponse, errorResponse } = require('../utils/apiResponse')
const { logActivity }       = require('./activityController')

const LOST_STATUSES = ['lost', 'not_interested', 'no_response']

const buildLostFilter = (query) => {
  const statusFilter = query.status && LOST_STATUSES.includes(query.status)
    ? [query.status]
    : LOST_STATUSES

  const filter = { status: { $in: statusFilter } }

  if (query.lostReason) filter.lostReason = query.lostReason
  if (query.assignedTo) filter.assignedTo = { $regex: query.assignedTo, $options: 'i' }
  if (query.search) {
    filter.$or = [
      { name:    { $regex: query.search, $options: 'i' } },
      { email:   { $regex: query.search, $options: 'i' } },
      { phone:   { $regex: query.search, $options: 'i' } },
      { company: { $regex: query.search, $options: 'i' } },
    ]
  }
  if (query.from || query.to) {
    filter.updatedAt = {}
    if (query.from) filter.updatedAt.$gte = new Date(query.from)
    if (query.to)   filter.updatedAt.$lte = new Date(query.to)
  }
  return filter
}

// ── GET /lost-leads ────────────────────────────────────────────
exports.getLostLeads = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1)
    const limit = Math.min(100, parseInt(req.query.limit) || 12)
    const skip  = (page - 1) * limit
    const sort  = req.query.sort || '-updatedAt'

    const filter = buildLostFilter(req.query)
    const [leads, total] = await Promise.all([
      Lead.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Lead.countDocuments(filter),
    ])

    successResponse(res, 200, 'Lost leads fetched', leads, {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (err) {
    next(err)
  }
}

// ── GET /lost-leads/stats ──────────────────────────────────────
exports.getLostStats = async (_req, res, next) => {
  try {
    const now        = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [statusAgg, reasonAgg, monthlyCount] = await Promise.all([
      Lead.aggregate([
        { $match: { status: { $in: LOST_STATUSES }, isDeleted: false } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Lead.aggregate([
        { $match: { status: { $in: ['lost', 'not_interested'] }, isDeleted: false, lostReason: { $ne: '' } } },
        { $group: { _id: '$lostReason', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Lead.countDocuments({
        status: { $in: LOST_STATUSES },
        isDeleted: false,
        updatedAt: { $gte: monthStart },
      }),
    ])

    const counts = { lost: 0, not_interested: 0, no_response: 0 }
    statusAgg.forEach(({ _id, count }) => { if (_id in counts) counts[_id] = count })

    successResponse(res, 200, 'Lost leads stats fetched', {
      total:          counts.lost + counts.not_interested + counts.no_response,
      lost:           counts.lost,
      notInterested:  counts.not_interested,
      noResponse:     counts.no_response,
      thisMonth:      monthlyCount,
      reasonBreakdown: reasonAgg.map(({ _id, count }) => ({ reason: _id, count })),
    })
  } catch (err) {
    next(err)
  }
}

// ── PATCH /lost-leads/:id/info (update lostReason + lostNote) ─
exports.updateLostInfo = async (req, res, next) => {
  try {
    const { lostReason, lostNote } = req.body

    const existing = await Lead.findOne({ _id: req.params.id, status: { $in: LOST_STATUSES } })
    if (!existing) return errorResponse(res, 404, 'Lost lead not found')

    const update = {}
    if (lostReason !== undefined) update.lostReason = lostReason
    if (lostNote   !== undefined) update.lostNote   = lostNote

    const lead = await Lead.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true })

    await logActivity({
      lead:        lead._id,
      action:      'updated',
      performedBy: req.user?._id,
      details:     { changed: { lostReason: { from: existing.lostReason, to: lostReason }, lostNote: { from: existing.lostNote, to: lostNote } } },
    })

    successResponse(res, 200, 'Lost info updated', lead)
  } catch (err) {
    next(err)
  }
}

// ── PATCH /lost-leads/:id/reactivate ──────────────────────────
exports.reactivateLead = async (req, res, next) => {
  try {
    const existing = await Lead.findOne({ _id: req.params.id, status: { $in: LOST_STATUSES } })
    if (!existing) return errorResponse(res, 404, 'Lost lead not found')

    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      { status: 'new', lostReason: '', lostNote: '' },
      { new: true, runValidators: true }
    )

    await logActivity({
      lead:        lead._id,
      action:      'status_changed',
      performedBy: req.user?._id,
      details:     { from: existing.status, to: 'new', note: 'Reactivated from lost leads' },
    })

    successResponse(res, 200, 'Lead reactivated successfully', lead)
  } catch (err) {
    next(err)
  }
}
