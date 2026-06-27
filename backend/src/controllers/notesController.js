const Note    = require('../models/Note')
const Lead    = require('../models/Lead')
const FollowUp = require('../models/FollowUp')
const { successResponse, errorResponse } = require('../utils/apiResponse')
const logger  = require('../utils/logger')

// ── GET /leads/:leadId/notes ───────────────────────────────────────────────
exports.getNotesByLead = async (req, res, next) => {
  try {
    const notes = await Note.find({ lead: req.params.leadId })
      .sort('-createdAt')
      .lean()
    successResponse(res, 200, 'Notes fetched', notes)
  } catch (err) {
    next(err)
  }
}

// ── POST /leads/:leadId/notes ──────────────────────────────────────────────
exports.createNote = async (req, res, next) => {
  try {
    const { content } = req.body
    if (!content?.trim()) return errorResponse(res, 400, 'Content is required')

    const lead = await Lead.findById(req.params.leadId)
    if (!lead) return errorResponse(res, 404, 'Lead not found')

    const note = await Note.create({
      lead:       req.params.leadId,
      content:    content.trim(),
      authorId:   req.user?._id   || null,
      authorName: req.user?.name  || '',
    })

    logger.info(`Note created: ${note._id} for lead ${lead._id}`)
    successResponse(res, 201, 'Note added', note)
  } catch (err) {
    next(err)
  }
}

// ── PUT /notes/:id ─────────────────────────────────────────────────────────
exports.updateNote = async (req, res, next) => {
  try {
    const { content } = req.body
    if (!content?.trim()) return errorResponse(res, 400, 'Content is required')

    const note = await Note.findById(req.params.id)
    if (!note) return errorResponse(res, 404, 'Note not found')

    note.content = content.trim()
    await note.save()

    logger.info(`Note updated: ${note._id}`)
    successResponse(res, 200, 'Note updated', note)
  } catch (err) {
    next(err)
  }
}

// ── DELETE /notes/:id ──────────────────────────────────────────────────────
exports.deleteNote = async (req, res, next) => {
  try {
    const note = await Note.findByIdAndDelete(req.params.id)
    if (!note) return errorResponse(res, 404, 'Note not found')

    logger.info(`Note deleted: ${req.params.id}`)
    successResponse(res, 200, 'Note deleted')
  } catch (err) {
    next(err)
  }
}

// ── GET /followups/:followupId/notes ───────────────────────────────────────
exports.getNotesByFollowup = async (req, res, next) => {
  try {
    const notes = await Note.find({ followup: req.params.followupId })
      .sort('-createdAt')
      .lean()
    successResponse(res, 200, 'Notes fetched', notes)
  } catch (err) {
    next(err)
  }
}

// ── POST /followups/:followupId/notes ──────────────────────────────────────
exports.createFollowUpNote = async (req, res, next) => {
  try {
    const { content } = req.body
    if (!content?.trim()) return errorResponse(res, 400, 'Content is required')

    const followup = await FollowUp.findById(req.params.followupId)
    if (!followup) return errorResponse(res, 404, 'Follow-up not found')

    const note = await Note.create({
      followup:   req.params.followupId,
      content:    content.trim(),
      authorId:   req.user?._id   || null,
      authorName: req.user?.name  || '',
    })

    logger.info(`Note created: ${note._id} for followup ${followup._id}`)
    successResponse(res, 201, 'Note added', note)
  } catch (err) {
    next(err)
  }
}
