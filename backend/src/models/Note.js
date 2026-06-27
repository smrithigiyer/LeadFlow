const mongoose = require('mongoose')

const noteSchema = new mongoose.Schema(
  {
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      default: null,
    },
    followup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FollowUp',
      default: null,
    },
    content: {
      type: String,
      required: [true, 'Content is required'],
      trim: true,
      maxlength: [500, 'Note cannot exceed 500 characters'],
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    authorName: {
      type: String,
      trim: true,
      maxlength: [100, 'Author name cannot exceed 100 characters'],
      default: '',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

noteSchema.index({ lead:     1, createdAt: -1 })
noteSchema.index({ followup: 1, createdAt: -1 })

module.exports = mongoose.model('Note', noteSchema)
