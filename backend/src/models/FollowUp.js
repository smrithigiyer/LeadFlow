const mongoose = require('mongoose')

const TYPES     = ['call', 'email', 'meeting', 'demo', 'other']
const OUTCOMES  = ['pending', 'completed', 'no_answer', 'rescheduled', 'cancelled']

const followUpSchema = new mongoose.Schema(
  {
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: [true, 'Lead reference is required'],
    },
    type: {
      type: String,
      enum: { values: TYPES, message: '{VALUE} is not a valid follow-up type' },
      default: 'call',
    },
    scheduledAt: {
      type: Date,
      required: [true, 'Scheduled date/time is required'],
    },
    outcome: {
      type: String,
      enum: { values: OUTCOMES, message: '{VALUE} is not a valid outcome' },
      default: 'pending',
    },
    notes: {
      type: String,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
      default: '',
    },
    isDeleted: {
      type: Boolean,
      default: false,
      select: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

followUpSchema.index({ lead: 1 })
followUpSchema.index({ scheduledAt: 1 })
followUpSchema.index({ outcome: 1 })

followUpSchema.pre(/^(find|countDocuments)/, function (next) {
  if (this.getFilter().isDeleted === undefined) {
    this.where({ isDeleted: false })
  }
  next()
})

module.exports = mongoose.model('FollowUp', followUpSchema)
