import mongoose from "mongoose";

const { Schema } = mongoose;

const ExerciseSchema = new Schema(
  {
    name: { type: String, required: true },
    sets: { type: Number, default: null },
    reps: { type: Number, default: null },
    weightKg: { type: Number, default: null },
    restSec: { type: Number, default: null },
    durationMin: { type: Number, default: null },
    notes: { type: String, default: "" },
  },
  { _id: true },
);

const WorkoutSchema = new Schema(
  {
    coachId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: { type: String, required: true },
    // "YYYY-MM-DD"
    assignedDate: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
      index: true,
    },

    exercises: { type: [ExerciseSchema], default: [] },

    completed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
    clientFeedback: { type: String, default: "" },
    clientRpe: { type: Number, min: 1, max: 10, default: null }, // Rate of perceived exertion

    // Is this a template (stored for re-use) rather than an assigned session?
    isTemplate: { type: Boolean, default: false, index: true },
    templateName: { type: String, default: "" },
  },
  { timestamps: true },
);

WorkoutSchema.index({ clientId: 1, assignedDate: 1 });

export default mongoose.model("Workout", WorkoutSchema);
