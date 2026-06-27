const mongoose = require('mongoose')

const ACTIONS = [
  'created',
  'updated',
  'status_changed',
  'assigned',
  'note_added',
  'follow_up_added',
  'follow_up_updated',
  'follow_up_deleted',
  'imported',
  'deleted',
  'email_sent',
  'enquiry_submitted',  // new lead created via public enquiry form
  'enquiry_repeat',     // existing lead re-submitted the public enquiry form
]

const activityLogSchema = new mongoose.Schema(
  {
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: { values: ACTIONS, message: '{VALUE} is not a valid action' },
      required: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

activityLogSchema.index({ lead: 1, createdAt: -1 })

module.exports = mongoose.model('ActivityLog', activityLogSchema)
