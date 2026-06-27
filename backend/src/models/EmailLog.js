const mongoose = require('mongoose')

const emailLogSchema = new mongoose.Schema(
  {
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
      index: true,
    },
    to: { type: String, required: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    status: {
      type: String,
      enum: ['sent', 'failed'],
      required: true,
    },
    error: { type: String, default: null },
  },
  { timestamps: true, versionKey: false }
)

emailLogSchema.index({ lead: 1, createdAt: -1 })

module.exports = mongoose.model('EmailLog', emailLogSchema)
