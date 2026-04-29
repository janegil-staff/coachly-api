// models/_workoutEntry.js
// Sub-schema. Add `workouts: [WorkoutEntrySchema]` to your Record schema.
import mongoose from "mongoose";

export const WorkoutEntrySchema = new mongoose.Schema(
  {
    // Reference to either a catalog or custom exercise
    exercise: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exercise",
      required: true,
    },
    // Snapshot at log-time so historical logs survive if exercise is renamed/deleted
    exerciseName: { type: String, required: true },
    category: {
      type: String,
      enum: ["strength", "cardio", "mobility", "recovery", "other"],
      required: true,
    },

    // All four fields are optional — user fills only what's relevant
    sets: { type: Number, min: 0, default: null },
    reps: { type: Number, min: 0, default: null },
    weight: { type: Number, min: 0, default: null }, // kg
    durationMinutes: { type: Number, min: 0, default: null },

    note: { type: String, default: "" },
  },
  { _id: true, timestamps: false }
);