import mongoose from "mongoose";

const { Schema } = mongoose;

const CoachingRelationshipSchema = new Schema(
  {
    coachId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // Null until a client redeems the invite
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    status: {
      type: String,
      enum: ["pending", "active", "paused", "ended"],
      default: "pending",
      index: true,
    },

    // 6-character invite code (e.g. "AB3K9X"), unique across active invites
    inviteCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    inviteCodeExpiresAt: { type: Date, required: true },

    // Optional context from the coach when creating the invite
    inviteMessage: { type: String, default: "" },

    // Private coach notes about the client (client never sees these)
    coachNotes: { type: String, default: "" },

    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Helpful compound index for "show me my active clients"
CoachingRelationshipSchema.index({ coachId: 1, status: 1 });
CoachingRelationshipSchema.index({ clientId: 1, status: 1 });

export default mongoose.model(
  "CoachingRelationship",
  CoachingRelationshipSchema,
);
