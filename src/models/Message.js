import mongoose from "mongoose";

const { Schema } = mongoose;

const MessageSchema = new Schema(
  {
    relationshipId: {
      type: Schema.Types.ObjectId,
      ref: "CoachingRelationship",
      required: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: { type: String, required: true, trim: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

MessageSchema.index({ relationshipId: 1, createdAt: -1 });

export default mongoose.model("Message", MessageSchema);
