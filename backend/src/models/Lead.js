const mongoose = require('mongoose')

const STATUSES = ['new', 'contacted', 'interested', 'meeting_scheduled', 'converted', 'no_response', 'not_interested', 'lost']
const SOURCES  = ['website', 'referral', 'social_media', 'cold_call', 'email_campaign', 'event', 'other', '']

const leadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    phone: {
      type: String,
      required: [true, 'Phone is required'],
      trim: true,
      maxlength: [20, 'Phone cannot exceed 20 characters'],
    },
    company: {
      type: String,
      trim: true,
      maxlength: [100, 'Company name cannot exceed 100 characters'],
      default: '',
    },
    source: {
      type: String,
      enum: { values: SOURCES, message: '{VALUE} is not a valid source' },
      default: '',
    },
    status: {
      type: String,
      enum: { values: STATUSES, message: '{VALUE} is not a valid status' },
      default: 'new',
    },
    assignedTo: {
      type: String,
      trim: true,
      maxlength: [100, 'Assigned name cannot exceed 100 characters'],
      default: '',
    },
    notes: {
      type: String,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
      default: '',
    },
    // Conversion tracking
    convertedAt: {
      type: Date,
      default: null,
    },
    dealValue: {
      type: Number,
      default: null,
      min: [0, 'Deal value cannot be negative'],
    },
    // Loss tracking
    lostReason: {
      type: String,
      enum: {
        values: ['price', 'competitor', 'timing', 'no_budget', 'no_need', 'unresponsive', 'other', ''],
        message: '{VALUE} is not a valid lost reason',
      },
      default: '',
    },
    lostNote: {
      type: String,
      maxlength: [500, 'Lost note cannot exceed 500 characters'],
      default: '',
    },
    // Soft-delete flag
    isDeleted: {
      type: Boolean,
      default: false,
      select: false,   // hidden from query results by default
    },
  },
  {
    timestamps: true,   // adds createdAt + updatedAt
    versionKey: false,
  }
)

// ── Indexes ────────────────────────────────────────────────────────────────
leadSchema.index({ name: 'text', email: 'text', phone: 'text', company: 'text' })
leadSchema.index({ status: 1 })
leadSchema.index({ createdAt: -1 })
leadSchema.index({ isDeleted: 1 })

// ── Exclude soft-deleted docs from every find query ────────────────────────
leadSchema.pre(/^(find|countDocuments)/, function (next) {
  if (this.getFilter().isDeleted === undefined) {
    this.where({ isDeleted: false })
  }
  next()
})

// ── Virtual: followup count (populated from FollowUp model) ────────────────
leadSchema.virtual('followups', {
  ref: 'FollowUp',
  localField: '_id',
  foreignField: 'lead',
})

module.exports = mongoose.model('Lead', leadSchema)
