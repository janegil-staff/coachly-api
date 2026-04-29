import mongoose from "mongoose";

const ExerciseSchema = new mongoose.Schema(
  {
    slug: { type: String, default: null, index: true },
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: ["strength", "cardio", "mobility", "recovery", "other"],
      index: true,
    },
    isCustom: { type: Boolean, default: false, index: true },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    defaultUnit: {
      type: String,
      enum: ["kg", "lb", "min", "km", "reps", null],
      default: null,
    },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

ExerciseSchema.index(
  { patient: 1, name: 1 },
  { unique: true, partialFilterExpression: { isCustom: true } }
);

export default mongoose.model("Exercise", ExerciseSchema);
