import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['message', 'join', 'leave'],
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
  }
});

// Index for faster queries on propertyId
chatMessageSchema.index({ propertyId: 1, timestamp: 1 });

export const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
