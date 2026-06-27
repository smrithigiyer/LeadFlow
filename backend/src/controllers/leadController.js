const { parse }             = require('csv-parse/sync')
const Lead                  = require('../models/Lead')
const FollowUp              = require('../models/FollowUp')
const { successResponse, errorResponse } = require('../utils/apiResponse')
const { logActivity }       = require('./activityController')
const { sendWelcomeMailToLead } = require('./emailController')
const logger                = require('../utils/logger')

// ── Helpers ────────────────────────────────────────────────────────────────

// Only active pipeline statuses belong in the Leads module
// lost/not_interested/no_response → Lost Leads module
// converted → Customers module
const LEAD_MODULE_STATUSES = ['new', 'contacted', 'interested', 'meeting_scheduled']

const buildFilter = (query, user) => {
  const filter = {}
  // Converted leads live in the Customers module — exclude them from the main leads list by default
  if (query.status) {
    filter.status = query.status
  } else {
    filter.status = { $in: LEAD_MODULE_STATUSES }
  }
  if (query.source)  filter.source = query.source
  // Staff can only see leads assigned to them; ignore any assignedTo query param
  if (user?.role === 'staff') {
    filter.assignedTo = user.name
  } else if (query.assignedTo) {
    filter.assignedTo = { $regex: query.assignedTo, $options: 'i' }
  }
  if (query.search) {
    filter.$or = [
      { name:    { $regex: query.search, $options: 'i' } },
      { email:   { $regex: query.search, $options: 'i' } },
      { phone:   { $regex: query.search, $options: 'i' } },
      { company: { $regex: query.search, $options: 'i' } },
    ]
  }
  if (query.from || query.to) {
    filter.createdAt = {}
    if (query.from) filter.createdAt.$gte = new Date(query.from)
    if (query.to)   filter.createdAt.$lte = new Date(query.to)
  }
  return filter
}

// ── GET /leads ─────────────────────────────────────────────────────────────
exports.getLeads = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1)
    const limit = Math.min(100, parseInt(req.query.limit) || 10)
    const skip  = (page - 1) * limit
    const sort  = req.query.sort || '-createdAt'

    const filter = buildFilter(req.query, req.user)
    const [leads, total] = await Promise.all([
      Lead.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Lead.countDocuments(filter),
    ])

    successResponse(res, 200, 'Leads fetched', leads, {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (err) {
    next(err)
  }
}

// ── GET /leads/stats ───────────────────────────────────────────────────────
exports.getStats = async (req, res, next) => {
  try {
    const now = new Date()
    const staffMatch = req.user?.role === 'staff' ? { assignedTo: req.user.name } : {}

    const [statusAgg, sourceAgg, pendingFollowups, missedFollowups, monthlyAgg] = await Promise.all([
      // Status breakdown
      Lead.aggregate([
        { $match: { isDeleted: false, ...staffMatch } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      // Source breakdown
      Lead.aggregate([
        { $match: { isDeleted: false, source: { $ne: '' }, ...staffMatch } },
        { $group: { _id: '$source', count: { $sum: 1 } } },
      ]),
      // Pending follow-ups (scheduled in future or today)
      FollowUp.countDocuments({ outcome: 'pending', isDeleted: false, scheduledAt: { $gte: now } }),
      // Missed follow-ups (pending but past due date)
      FollowUp.countDocuments({ outcome: 'pending', isDeleted: false, scheduledAt: { $lt: now } }),
      // Monthly lead counts for the last 6 months
      Lead.aggregate([
        { $match: { isDeleted: false, createdAt: { $gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) }, ...staffMatch } },
        {
          $group: {
            _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
    ])

    const result = {
      total: 0,
      new: 0, contacted: 0, interested: 0,
      meeting_scheduled: 0, converted: 0,
      no_response: 0, not_interested: 0, lost: 0,
      pendingFollowups,
      missedFollowups,
    }

    statusAgg.forEach(({ _id, count }) => {
      if (_id in result) result[_id] = count
      result.total += count
    })

    const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    result.sourceBreakdown = sourceAgg.map(({ _id, count }) => ({ name: _id, value: count }))
    result.monthlyTrend    = monthlyAgg.map(({ _id, count }) => ({
      month: MONTH_NAMES[_id.month - 1],
      leads: count,
    }))

    successResponse(res, 200, 'Stats fetched', result)
  } catch (err) {
    next(err)
  }
}

// ── GET /leads/:id ─────────────────────────────────────────────────────────
exports.getLeadById = async (req, res, next) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate({ path: 'followups', options: { sort: { scheduledAt: -1 } } })
      .lean({ virtuals: true })

    if (!lead) return errorResponse(res, 404, 'Lead not found')
    if (req.user?.role === 'staff' && lead.assignedTo !== req.user.name) {
      return errorResponse(res, 403, 'Access denied: this lead is not assigned to you')
    }
    successResponse(res, 200, 'Lead fetched', lead)
  } catch (err) {
    next(err)
  }
}

// ── Duplicate check helper ─────────────────────────────────────────────────
const checkDuplicate = async (email, phone, excludeId = null) => {
  const emailClean = (email || '').toLowerCase().trim()
  const phoneClean = (phone || '').replace(/\s+/g, '').trim()
  const orClauses  = []
  if (emailClean) orClauses.push({ email: emailClean })
  if (phoneClean) orClauses.push({ phone: { $regex: `^\\+?91?\\s?${phoneClean.replace(/^\+91\s?/, '')}$`, $options: 'i' } })
  if (!orClauses.length) return null

  const query = { $or: orClauses }
  if (excludeId) query._id = { $ne: excludeId }

  return Lead.findOne(query).select('name email phone source').lean()
}

// ── POST /leads ────────────────────────────────────────────────────────────
exports.createLead = async (req, res, next) => {
  try {
    const duplicate = await checkDuplicate(req.body.email, req.body.phone)
    if (duplicate) {
      const field = duplicate.email === (req.body.email || '').toLowerCase().trim() ? 'email' : 'phone number'
      const via   = duplicate.source === 'website' ? ' via enquiry form' : ''
      return errorResponse(res, 409, `A lead with this ${field} already exists${via} (${duplicate.name}). Search the Leads list to find and edit them.`)
    }

    const lead = await Lead.create(req.body)
    logger.info(`Lead created: ${lead._id} – ${lead.name}`)

    await logActivity({
      lead: lead._id,
      action: 'created',
      performedBy: req.user?._id,
      details: { name: lead.name, email: lead.email, source: lead.source, status: lead.status },
    })

    // Fire-and-forget — email failure must never block lead creation
    sendWelcomeMailToLead(lead, req.user?._id).catch((err) =>
      logger.warn(`Welcome email failed for lead ${lead._id}: ${err.message}`)
    )

    successResponse(res, 201, 'Lead created successfully', lead)
  } catch (err) {
    next(err)
  }
}

// ── PUT /leads/:id ─────────────────────────────────────────────────────────
exports.updateLead = async (req, res, next) => {
  try {
    delete req.body.isDeleted

    const existing = await Lead.findById(req.params.id).lean()
    if (!existing) return errorResponse(res, 404, 'Lead not found')
    if (req.user?.role === 'staff' && existing.assignedTo !== req.user.name) {
      return errorResponse(res, 403, 'Access denied: this lead is not assigned to you')
    }

    if (req.body.email || req.body.phone) {
      const duplicate = await checkDuplicate(
        req.body.email || existing.email,
        req.body.phone || existing.phone,
        req.params.id
      )
      if (duplicate) {
        const field = duplicate.email === (req.body.email || '').toLowerCase().trim() ? 'email' : 'phone number'
        return errorResponse(res, 409, `Another lead with this ${field} already exists (${duplicate.name})`)
      }
    }

    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )

    logger.info(`Lead updated: ${lead._id} – ${lead.name}`)

    // Build a diff of what changed
    const changed = {}
    const watchFields = ['name', 'email', 'phone', 'company', 'source', 'status', 'assignedTo', 'notes']
    watchFields.forEach((f) => {
      if (req.body[f] !== undefined && String(existing[f]) !== String(req.body[f])) {
        changed[f] = { from: existing[f], to: req.body[f] }
      }
    })

    if (changed.status) {
      await logActivity({
        lead: lead._id,
        action: 'status_changed',
        performedBy: req.user?._id,
        details: { from: changed.status.from, to: changed.status.to },
      })
    } else if (changed.assignedTo) {
      await logActivity({
        lead: lead._id,
        action: 'assigned',
        performedBy: req.user?._id,
        details: { from: changed.assignedTo.from, to: changed.assignedTo.to },
      })
    } else if (changed.notes) {
      await logActivity({
        lead: lead._id,
        action: 'note_added',
        performedBy: req.user?._id,
        details: { note: req.body.notes },
      })
    } else if (Object.keys(changed).length > 0) {
      await logActivity({
        lead: lead._id,
        action: 'updated',
        performedBy: req.user?._id,
        details: { changed },
      })
    }

    successResponse(res, 200, 'Lead updated successfully', lead)
  } catch (err) {
    next(err)
  }
}

// ── PATCH /leads/:id/status ────────────────────────────────────────────────
exports.updateStatus = async (req, res, next) => {
  try {
    const { status, lostReason, lostNote } = req.body

    const existing = await Lead.findById(req.params.id).lean()
    if (!existing) return errorResponse(res, 404, 'Lead not found')

    const update = { status }

    if (status === 'converted') {
      update.convertedAt = new Date()
      update.lostReason  = ''
      update.lostNote    = ''
    } else if (['lost', 'not_interested', 'no_response'].includes(status)) {
      if (lostReason !== undefined) update.lostReason = lostReason
      if (lostNote   !== undefined) update.lostNote   = lostNote
      if (existing.status === 'converted') update.convertedAt = null
    } else {
      // Moving back into active pipeline — clear loss fields
      if (['lost', 'not_interested', 'no_response'].includes(existing.status)) {
        update.lostReason = ''
        update.lostNote   = ''
      }
    }

    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    )

    logger.info(`Lead status changed: ${lead._id} → ${status}`)

    await logActivity({
      lead: lead._id,
      action: 'status_changed',
      performedBy: req.user?._id,
      details: { from: existing.status, to: status },
    })

    successResponse(res, 200, 'Status updated', lead)
  } catch (err) {
    next(err)
  }
}

// ── DELETE /leads/:id (soft-delete) ───────────────────────────────────────
exports.deleteLead = async (req, res, next) => {
  try {
    const existing = await Lead.findById(req.params.id).lean()
    if (!existing) return errorResponse(res, 404, 'Lead not found')
    if (req.user?.role === 'staff' && existing.assignedTo !== req.user.name) {
      return errorResponse(res, 403, 'Access denied: this lead is not assigned to you')
    }

    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true },
      { new: true }
    )

    if (!lead) return errorResponse(res, 404, 'Lead not found')
    logger.info(`Lead soft-deleted: ${lead._id} – ${lead.name}`)

    await logActivity({
      lead: lead._id,
      action: 'deleted',
      performedBy: req.user?._id,
      details: { name: lead.name },
    })

    successResponse(res, 200, 'Lead deleted successfully')
  } catch (err) {
    next(err)
  }
}

// Normalize phone for duplicate comparison (strip country code, spaces, punctuation)
const normalizePhone = (phone) => {
  if (!phone) return ''
  let p = String(phone).replace(/[\s\-\.\(\)]/g, '')
  p = p.replace(/^\+91/, '').replace(/^91(\d{10})$/, '$1')
  return p
}

// ── POST /leads/import (CSV / XLSX) ───────────────────────────────────────
exports.importLeads = async (req, res, next) => {
  try {
    if (!req.file) return errorResponse(res, 400, 'File is required')

    let records = []
    const ext = (req.file.originalname || '').toLowerCase()

    if (ext.endsWith('.xlsx') || ext.endsWith('.xls')) {
      let XLSX
      try {
        XLSX = require('xlsx')
      } catch {
        return errorResponse(res, 400, 'xlsx package not installed. Please contact admin.')
      }
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' })
      const sheet    = workbook.Sheets[workbook.SheetNames[0]]
      const raw      = XLSX.utils.sheet_to_json(sheet, { defval: '' })
      records = raw.map((row) => {
        const norm = {}
        Object.keys(row).forEach((k) => {
          norm[k.toLowerCase().trim().replace(/\s+/g, '_')] = String(row[k]).trim()
        })
        return norm
      })
    } else {
      records = parse(req.file.buffer, {
        columns: (header) =>
          header.map((h) => h.replace(/"/g, '').trim().toLowerCase().replace(/\s+/g, '_')),
        skip_empty_lines: true,
        trim: true,
      })
    }

    if (!records.length) return errorResponse(res, 400, 'File is empty or has no data rows')

    const VALID_STATUSES = ['new','contacted','interested','meeting_scheduled','converted','no_response','not_interested','lost']
    const VALID_SOURCES  = ['website','referral','social_media','cold_call','email_campaign','event','other']

    const parsed = records
      .map((row) => {
        const status = VALID_STATUSES.includes(row.status) ? row.status : 'new'
        const source = VALID_SOURCES.includes(row.source || row.lead_source) ? (row.source || row.lead_source) : ''
        return {
          name:       row.name    || row.full_name     || '',
          email:      (row.email  || row.email_address || '').toLowerCase().trim(),
          phone:      (row.phone  || row.phone_number  || '').trim(),
          company:    row.company || row.company_name  || '',
          source,
          status,
          notes:      row.notes          || '',
          assignedTo: row.assigned_to    || row.assignedto || '',
        }
      })
      .filter((r) => r.name && r.email && r.phone)

    if (!parsed.length) {
      return errorResponse(res, 400, 'No valid leads found in file (name, email, phone required)')
    }

    // ── Duplicate detection ────────────────────────────────────────────────
    // Build phone variants to catch +91 / 91 prefix differences in the DB
    const fileEmails = parsed.map((r) => r.email)
    const filePhones = parsed.map((r) => normalizePhone(r.phone))
    const phoneVariants = [...new Set([
      ...filePhones,
      ...filePhones.map((p) => `+91${p}`),
      ...filePhones.filter((p) => p.length === 10).map((p) => `91${p}`),
    ])]

    // One DB query to fetch any existing leads that conflict
    const existingLeads = await Lead.find(
      { $or: [{ email: { $in: fileEmails } }, { phone: { $in: phoneVariants } }] },
      'email phone'
    ).lean()

    const dbEmails = new Set(existingLeads.map((l) => l.email.toLowerCase().trim()))
    const dbPhones = new Set(existingLeads.map((l) => normalizePhone(l.phone)))

    // Walk through rows, tracking within-file duplicates too
    const seenEmails   = new Set()
    const seenPhones   = new Set()
    const toInsert     = []
    const skipped      = []

    for (const row of parsed) {
      const eKey = row.email
      const pKey = normalizePhone(row.phone)

      if (dbEmails.has(eKey)) {
        skipped.push({ name: row.name, reason: 'email already exists' })
        continue
      }
      if (dbPhones.has(pKey)) {
        skipped.push({ name: row.name, reason: 'phone already exists' })
        continue
      }
      if (seenEmails.has(eKey)) {
        skipped.push({ name: row.name, reason: 'duplicate email in file' })
        continue
      }
      if (seenPhones.has(pKey)) {
        skipped.push({ name: row.name, reason: 'duplicate phone in file' })
        continue
      }

      seenEmails.add(eKey)
      seenPhones.add(pKey)
      toInsert.push(row)
    }

    // ── Insert clean rows ──────────────────────────────────────────────────
    let inserted = []
    if (toInsert.length > 0) {
      inserted = await Lead.insertMany(toInsert, { ordered: false })
      logger.info(`Bulk import: ${inserted.length} inserted, ${skipped.length} skipped`)

      const activityDocs = inserted.map((l) => ({
        lead: l._id,
        action: 'imported',
        performedBy: req.user?._id,
        details: { source: 'file_import', fileName: req.file.originalname },
      }))
      await require('../models/ActivityLog').insertMany(activityDocs, { ordered: false }).catch(() => {})

      if (req.body.sendWelcome === 'true') {
        inserted.forEach((lead) => {
          sendWelcomeMailToLead(lead, req.user?._id).catch((err) =>
            logger.warn(`Welcome email failed for imported lead ${lead._id}: ${err.message}`)
          )
        })
        logger.info(`Welcome emails queued for ${inserted.length} imported leads`)
      }
    }

    const message = skipped.length
      ? `${inserted.length} leads imported, ${skipped.length} skipped (duplicate email or phone)`
      : `${inserted.length} leads imported successfully`

    successResponse(res, 201, message, {
      imported:       inserted.length,
      skipped:        skipped.length,
      skippedDetails: skipped,
    })
  } catch (err) {
    if (err.code === 11000 || err.name === 'BulkWriteError') {
      const inserted = err.insertedDocs?.length || 0
      return successResponse(res, 207, 'Import completed with some duplicates skipped', {
        imported: inserted,
      })
    }
    next(err)
  }
}

// ── GET /leads/export (CSV) ────────────────────────────────────────────────
exports.exportLeads = async (req, res, next) => {
  try {
    const filter = buildFilter(req.query, req.user)
    const leads  = await Lead.find(filter).sort('-createdAt').lean()

    const headers = ['Name', 'Email', 'Phone', 'Company', 'Source', 'Status', 'Assigned To', 'Notes', 'Created At']
    const rows = leads.map((l) => [
      l.name,
      l.email,
      l.phone,
      l.company    || '',
      l.source     || '',
      l.status,
      l.assignedTo || '',
      (l.notes || '').replace(/"/g, '""'),
      l.createdAt ? new Date(l.createdAt).toISOString().split('T')[0] : '',
    ])

    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${c ?? ''}"`).join(','))
      .join('\n')

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"')
    res.send(csv)
  } catch (err) {
    next(err)
  }
}

// ── PATCH /leads/bulk ─────────────────────────────────────────────────────
exports.bulkAction = async (req, res, next) => {
  try {
    const { ids, action, assignedTo, status } = req.body

    if (!Array.isArray(ids) || ids.length === 0) {
      return errorResponse(res, 400, 'No lead IDs provided')
    }

    // Staff: verify all submitted IDs belong to leads assigned to them
    if (req.user?.role === 'staff') {
      const owned = await Lead.find({ _id: { $in: ids }, assignedTo: req.user.name }).select('_id').lean()
      const ownedSet = new Set(owned.map((l) => String(l._id)))
      const unauthorized = ids.filter((id) => !ownedSet.has(String(id)))
      if (unauthorized.length > 0) {
        return errorResponse(res, 403, 'Access denied: one or more leads are not assigned to you')
      }
    }

    const VALID_STATUSES = ['new','contacted','interested','meeting_scheduled','converted','no_response','not_interested','lost']
    let update = {}
    let activityAction = ''
    let activityDetails = {}

    if (action === 'assign') {
      if (assignedTo === undefined) return errorResponse(res, 400, 'assignedTo is required')
      update = { assignedTo }
      activityAction = 'assigned'
      activityDetails = { to: assignedTo }
    } else if (action === 'status') {
      if (!VALID_STATUSES.includes(status)) return errorResponse(res, 400, 'Invalid status')
      update = { status }
      activityAction = 'status_changed'
      activityDetails = { to: status }
    } else if (action === 'reactivate') {
      update = { status: 'new', lostReason: '', lostNote: '' }
      activityAction = 'status_changed'
      activityDetails = { to: 'new', note: 'Bulk reactivated' }
    } else if (action === 'delete') {
      update = { isDeleted: true }
      activityAction = 'deleted'
    } else {
      return errorResponse(res, 400, 'Invalid action — must be assign, status, reactivate, or delete')
    }

    const result = await Lead.updateMany({ _id: { $in: ids }, isDeleted: { $ne: true } }, update)
    logger.info(`Bulk ${action}: ${result.modifiedCount} leads`)

    const activityDocs = ids.map((id) => ({
      lead: id,
      action: activityAction,
      performedBy: req.user?._id,
      details: activityDetails,
    }))
    await require('../models/ActivityLog').insertMany(activityDocs, { ordered: false }).catch(() => {})

    successResponse(res, 200, `${result.modifiedCount} leads updated`, { modified: result.modifiedCount })
  } catch (err) {
    next(err)
  }
}

// ── POST /public/leads (unauthenticated – website enquiry form) ────────────
exports.createPublicLead = async (req, res, next) => {
  try {
    const { name, email, phone, message } = req.body
    const Note = require('../models/Note')

    // ── Duplicate: same person re-submitting the form ─────────────────────
    const existing = await checkDuplicate(email, phone)
    if (existing) {
      if (message) {
        await Note.create({
          lead:       existing._id,
          content:    message,
          authorName: 'Enquiry Form',
        }).catch(() => {})
      }

      await logActivity({
        lead:        existing._id,
        action:      'enquiry_repeat',
        performedBy: null,
        details:     { note: message || '' },
      })

      logger.info(`Public enquiry duplicate — note added to existing lead ${existing._id}`)
      return successResponse(res, 200, 'Enquiry submitted successfully', { id: existing._id })
    }

    // ── New lead ───────────────────────────────────────────────────────────
    const lead = await Lead.create({
      name,
      email,
      phone:  phone   || '',
      notes:  message || '',
      source: 'website',
      status: 'new',
    })

    // Save the enquiry message as a thread Note so it appears in the Notes tab
    if (message) {
      await Note.create({
        lead:       lead._id,
        content:    message,
        authorName: 'Enquiry Form',
      }).catch(() => {})
    }

    await logActivity({
      lead:        lead._id,
      action:      'enquiry_submitted',
      performedBy: null,
      details:     { name: lead.name, note: message || '' },
    })

    logger.info(`Public enquiry created: ${lead._id} – ${lead.name}`)

    sendWelcomeMailToLead(lead, null).catch((err) =>
      logger.warn(`Welcome email failed for public lead ${lead._id}: ${err.message}`)
    )

    successResponse(res, 201, 'Enquiry submitted successfully', { id: lead._id })
  } catch (err) {
    next(err)
  }
}

// ── POST /public/meeting (unauthenticated – schedule meeting form) ─────────
exports.createMeetingRequest = async (req, res, next) => {
  try {
    const { name, email, phone, company, preferredDate, preferredTime, message } = req.body

    // Duplicate check — same person re-submitting the meeting form
    const existing = await checkDuplicate(email, phone)
    if (existing) {
      // Capture the new meeting details as a note on the existing lead
      const repeatNote = [
        'Meeting request re-submitted (website form)',
        preferredDate ? `Preferred Date: ${preferredDate}` : '',
        preferredTime ? `Preferred Time: ${preferredTime}` : '',
        message       ? `Message: ${message}` : '',
      ].filter(Boolean).join('\n')

      await require('../models/Note').create({
        lead:       existing._id,
        content:    repeatNote,
        authorName: 'Website Form',
      }).catch(() => {})

      await logActivity({
        lead:        existing._id,
        action:      'note_added',
        performedBy: null,
        details:     { source: 'schedule_meeting_form_repeat', name: existing.name, preferredDate, preferredTime },
      })
      logger.info(`Meeting request duplicate — note added to existing lead ${existing._id}`)
      return successResponse(res, 200, 'Meeting request submitted successfully', { id: existing._id })
    }

    const notes = [
      message ? `Message: ${message}` : '',
      preferredDate ? `Preferred Date: ${preferredDate}` : '',
      preferredTime ? `Preferred Time: ${preferredTime}` : '',
    ].filter(Boolean).join('\n')

    const lead = await Lead.create({
      name,
      email,
      phone:   phone   || '',
      company: company || '',
      notes,
      source:  'website',
      status:  'meeting_scheduled',
    })

    logger.info(`Meeting request created: ${lead._id} – ${lead.name}`)

    await logActivity({
      lead:        lead._id,
      action:      'created',
      performedBy: null,
      details:     { source: 'schedule_meeting_form', name: lead.name, preferredDate, preferredTime },
    })

    successResponse(res, 201, 'Meeting request submitted successfully', { id: lead._id })
  } catch (err) {
    next(err)
  }
}
