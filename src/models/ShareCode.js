// src/models/ShareCode.js
import mongoose from "mongoose";

const ShareCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, index: true },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  includeNotes: { type: Boolean, default: true },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Auto-delete expired codes
ShareCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("ShareCode", ShareCodeSchema);
