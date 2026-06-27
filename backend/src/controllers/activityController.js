const ActivityLog = require('../models/ActivityLog')
const { successResponse, errorResponse } = require('../utils/apiResponse')

// Internal helper — call from other controllers to record events
exports.logActivity = async ({ lead, action, performedBy = null, details = {} }) => {
  try {
    await ActivityLog.create({ lead, action, performedBy, details })
  } catch (_) {
  }
}

// GET /leads/:id/activities
exports.getActivitiesByLead = async (req, res, next) => {
  try {
    const activities = await ActivityLog.find({ lead: req.params.id })
      .populate('performedBy', 'name email role')
      .sort('-createdAt')
      .lean()

    successResponse(res, 200, 'Activities fetched', activities)
  } catch (err) {
    next(err)
  }
}
