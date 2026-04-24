import mongoose from "mongoose";

const { Schema } = mongoose;

const DailyScoreSchema = new Schema(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },

    // Composite 0-100 rolling up mood + energy + sleep + workout + nutrition
    compositeScore: { type: Number, min: 0, max: 100, default: 0 },

    // Component breakdown for transparency (each 0-100)
    wellbeingScore: { type: Number, default: 0 },
    sleepScore: { type: Number, default: 0 },
    workoutScore: { type: Number, default: 0 },
    nutritionScore: { type: Number, default: 0 },

    streakDay: { type: Number, default: 0 }, // consecutive logged days ending on this date
  },
  { timestamps: true },
);

DailyScoreSchema.index({ clientId: 1, date: 1 }, { unique: true });

export default mongoose.model("DailyScore", DailyScoreSchema);
