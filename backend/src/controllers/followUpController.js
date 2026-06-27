const FollowUp              = require('../models/FollowUp')
const Lead                  = require('../models/Lead')
const { successResponse, errorResponse } = require('../utils/apiResponse')
const { logActivity }       = require('./activityController')
const logger                = require('../utils/logger')

// Fetch lead docs regardless of isDeleted status.
// Passing isDeleted explicitly prevents the Lead pre-hook from adding
// its own { isDeleted: false } filter, which would exclude soft-deleted leads.
async function fetchLeadsById(ids, fields) {
  if (!ids.length) return {}
  const leads = await Lead.find(
    { _id: { $in: ids }, isDeleted: { $in: [true, false, null] } },
    fields
  ).lean()
  const map = {}
  leads.forEach((l) => { map[l._id.toString()] = l })
  return map
}

// ── GET /followups  (optionally filter by lead) ────────────────────────────
exports.getFollowUps = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1)
    const limit = Math.min(500, parseInt(req.query.limit) || 20)
    const skip  = (page - 1) * limit

    const filter = {}
    if (req.query.lead)    filter.lead    = req.query.lead
    if (req.query.outcome) filter.outcome = req.query.outcome
    if (req.query.type)    filter.type    = req.query.type

    if (req.query.from || req.query.to) {
      filter.scheduledAt = {}
      if (req.query.from) filter.scheduledAt.$gte = new Date(req.query.from)
      if (req.query.to)   filter.scheduledAt.$lte = new Date(req.query.to)
    }

    // Staff: scope to follow-ups belonging to their assigned leads only
    if (req.user?.role === 'staff') {
      const assignedLeads = await Lead.find({ assignedTo: req.user.name }).select('_id').lean()
      filter.lead = { $in: assignedLeads.map((l) => l._id) }
    }

    const [followupsRaw, total] = await Promise.all([
      FollowUp.find(filter).sort('-scheduledAt').skip(skip).limit(limit).lean(),
      FollowUp.countDocuments(filter),
    ])

    const leadIds = [...new Set(followupsRaw.map((f) => f.lead?.toString()).filter(Boolean))]
    const leadsById = await fetchLeadsById(leadIds, 'name email phone company')

    const followups = followupsRaw.map((f) => ({
      ...f,
      lead: f.lead ? (leadsById[f.lead.toString()] || null) : null,
    }))

    successResponse(res, 200, 'Follow-ups fetched', followups, {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (err) {
    next(err)
  }
}

// ── GET /leads/:leadId/followups ───────────────────────────────────────────
exports.getFollowUpsByLead = async (req, res, next) => {
  try {
    const lead = await Lead.findById(req.params.leadId)
    if (!lead) return errorResponse(res, 404, 'Lead not found')

    const followups = await FollowUp.find({ lead: req.params.leadId })
      .sort('-scheduledAt')
      .lean()

    successResponse(res, 200, 'Follow-ups fetched', followups)
  } catch (err) {
    next(err)
  }
}

// ── GET /followups/:id ─────────────────────────────────────────────────────
exports.getFollowUpById = async (req, res, next) => {
  try {
    const followup = await FollowUp.findById(req.params.id).lean()
    if (!followup) return errorResponse(res, 404, 'Follow-up not found')

    const leadsById = await fetchLeadsById(
      followup.lead ? [followup.lead.toString()] : [],
      'name email phone company status'
    )
    followup.lead = followup.lead ? (leadsById[followup.lead.toString()] || null) : null

    successResponse(res, 200, 'Follow-up fetched', followup)
  } catch (err) {
    next(err)
  }
}

// ── POST /leads/:leadId/followups ──────────────────────────────────────────
exports.createFollowUp = async (req, res, next) => {
  try {
    const lead = await Lead.findById(req.params.leadId)
    if (!lead) return errorResponse(res, 404, 'Lead not found')

    const followup = await FollowUp.create({
      ...req.body,
      lead: req.params.leadId,
    })

    const leadsById = await fetchLeadsById([req.params.leadId], 'name email phone company')
    const result    = { ...followup.toObject(), lead: leadsById[req.params.leadId] || null }

    logger.info(`Follow-up created: ${followup._id} for lead ${lead._id}`)

    await logActivity({
      lead: req.params.leadId,
      action: 'follow_up_added',
      performedBy: req.user?._id,
      details: { type: followup.type, scheduledAt: followup.scheduledAt, notes: followup.notes },
    })

    successResponse(res, 201, 'Follow-up scheduled', result)
  } catch (err) {
    next(err)
  }
}

// ── PUT /followups/:id ─────────────────────────────────────────────────────
exports.updateFollowUp = async (req, res, next) => {
  try {
    delete req.body.lead
    delete req.body.isDeleted

    const followup = await FollowUp.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).lean()

    if (!followup) return errorResponse(res, 404, 'Follow-up not found')

    const leadIdStr = followup.lead?.toString()
    const leadsById = await fetchLeadsById(leadIdStr ? [leadIdStr] : [], 'name email phone company')
    const result    = { ...followup, lead: leadIdStr ? (leadsById[leadIdStr] || null) : null }

    logger.info(`Follow-up updated: ${followup._id}`)

    await logActivity({
      lead: leadIdStr,
      action: 'follow_up_updated',
      performedBy: req.user?._id,
      details: { type: followup.type, scheduledAt: followup.scheduledAt, outcome: followup.outcome },
    })

    successResponse(res, 200, 'Follow-up updated', result)
  } catch (err) {
    next(err)
  }
}

// ── PATCH /followups/:id/outcome ───────────────────────────────────────────
exports.updateOutcome = async (req, res, next) => {
  try {
    const followup = await FollowUp.findByIdAndUpdate(
      req.params.id,
      { outcome: req.body.outcome },
      { new: true, runValidators: true }
    )

    if (!followup) return errorResponse(res, 404, 'Follow-up not found')
    successResponse(res, 200, 'Outcome updated', followup)
  } catch (err) {
    next(err)
  }
}

// ── PATCH /followups/bulk ─────────────────────────────────────────────────
exports.bulkFollowUp = async (req, res, next) => {
  try {
    const { ids, action, outcome } = req.body

    if (!Array.isArray(ids) || ids.length === 0)
      return errorResponse(res, 400, 'No follow-up IDs provided')

    const VALID_OUTCOMES = ['pending', 'completed', 'no_answer', 'rescheduled', 'cancelled']
    let update = {}

    if (action === 'outcome') {
      if (!VALID_OUTCOMES.includes(outcome)) return errorResponse(res, 400, 'Invalid outcome')
      update = { outcome }
    } else if (action === 'delete') {
      update = { isDeleted: true }
    } else {
      return errorResponse(res, 400, 'Invalid action — must be outcome or delete')
    }

    const result = await FollowUp.updateMany({ _id: { $in: ids } }, update)
    logger.info(`Bulk followup ${action}: ${result.modifiedCount}`)

    successResponse(res, 200, `${result.modifiedCount} follow-ups updated`, { modified: result.modifiedCount })
  } catch (err) {
    next(err)
  }
}

// ── DELETE /followups/:id (soft-delete) ────────────────────────────────────
exports.deleteFollowUp = async (req, res, next) => {
  try {
    const followup = await FollowUp.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true },
      { new: true }
    )

    if (!followup) return errorResponse(res, 404, 'Follow-up not found')
    logger.info(`Follow-up soft-deleted: ${followup._id}`)

    await logActivity({
      lead: followup.lead,
      action: 'follow_up_deleted',
      performedBy: req.user?._id,
      details: { type: followup.type, scheduledAt: followup.scheduledAt },
    })

    successResponse(res, 200, 'Follow-up deleted successfully')
  } catch (err) {
    next(err)
  }
}
