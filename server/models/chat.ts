import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['message', 'join', 'leave', 'delete'],
    required: true
  },
  userId: {
    type: Number,
    required: true
  },
  username: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  propertyId: {
    type: Number,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
});

// Index for faster queries on propertyId
chatMessageSchema.index({ propertyId: 1, timestamp: 1 });

export const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);