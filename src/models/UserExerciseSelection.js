// src/models/UserExerciseSelection.js
//
// Tracks which catalog exercises (by slug) the user has selected as "their"
// exercises. Custom exercises are always considered selected (no entry needed
// here — the Exercise document itself is the user's).
//
// One document per user.

import mongoose from "mongoose";

const UserExerciseSelectionSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // one row per user
      index: true,
    },
    // Array of catalog slugs the user has picked, e.g. ["bench_press", "running"]
    selectedSlugs: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.model(
  "UserExerciseSelection",
  UserExerciseSelectionSchema
);
