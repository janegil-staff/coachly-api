import mongoose from "mongoose";

const { Schema } = mongoose;

const LogEntrySchema = new Schema(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // "YYYY-MM-DD" — one entry per day per client
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
      index: true,
    },

    // ── Wellbeing (1-5) ────────────────────────────────────────────────────
    mood: { type: Number, min: 1, max: 5, default: null },
    energy: { type: Number, min: 1, max: 5, default: null },
    stress: { type: Number, min: 1, max: 5, default: null },
    soreness: { type: Number, min: 1, max: 5, default: null },

    // ── Sleep ──────────────────────────────────────────────────────────────
    sleepHours: { type: Number, min: 0, max: 24, default: null },
    sleepQuality: { type: Number, min: 1, max: 5, default: null },

    // ── Body ───────────────────────────────────────────────────────────────
    weightKg: { type: Number, min: 0, max: 500, default: null },
    waistCm: { type: Number, min: 0, max: 300, default: null },

    // ── Workout ────────────────────────────────────────────────────────────
    didWorkout: { type: Boolean, default: false },
    workoutType: {
      type: String,
      enum: ["strength", "cardio", "mobility", "rest", "mixed", null],
      default: null,
    },
    workoutDurationMin: { type: Number, min: 0, max: 600, default: null },
    workoutIntensity: { type: Number, min: 1, max: 5, default: null },
    workoutNotes: { type: String, default: "" },

    // ── Nutrition (light-touch) ───────────────────────────────────────────
    mealsOnPlan: { type: Number, min: 0, max: 10, default: null },
    waterGlasses: { type: Number, min: 0, max: 50, default: null },

    // ── Optional ───────────────────────────────────────────────────────────
    steps: { type: Number, min: 0, default: null },
    note: { type: String, default: "" },
  },
  { timestamps: true },
);

// One log per client per day
LogEntrySchema.index({ clientId: 1, date: 1 }, { unique: true });

export default mongoose.model("LogEntry", LogEntrySchema);
