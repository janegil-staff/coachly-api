import mongoose from "mongoose";

const { Schema } = mongoose;

// Per-category duration (e.g. { type: "strength", durationMinutes: 45 })
const CategoryDurationSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["strength", "cardio", "mobility", "recovery", "other"],
      required: true,
    },
    durationMinutes: { type: Number, min: 0, max: 600, default: 0 },
  },
  { _id: false },
);

// Specific exercise picked for the day. May be a catalog item (slug) or a
// custom user exercise (exerciseId). `durationMinutes` is kept for backward
// compatibility with legacy entries that stored time per exercise; new
// entries store time on `categoryDurations` instead.
const WorkoutSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["strength", "cardio", "mobility", "recovery", "other"],
      required: true,
    },
    name: { type: String, default: null },
    exerciseSlug: { type: String, default: null },
    exerciseId: {
      type: Schema.Types.ObjectId,
      ref: "Exercise",
      default: null,
    },
    durationMinutes: { type: Number, min: 0, max: 600, default: 0 },
  },
  { _id: false },
);

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

    // ── Day type ──────────────────────────────────────────────────────────
    isRestDay: { type: Boolean, default: false },

    // ── Workouts ──────────────────────────────────────────────────────────
    // Per-category durations (empty on rest days). This is the source of
    // truth for total time per category.
    categoryDurations: {
      type: [CategoryDurationSchema],
      default: [],
    },
    // Specific exercises picked for the day (empty on rest days). Each item
    // is tagged with its category via `type`.
    workouts: { type: [WorkoutSchema], default: [] },

    // ── Workout perceived exertion (null on rest days) ────────────────────
    effort: { type: Number, min: 1, max: 5, default: null },

    // ── Wellbeing (1-5) ───────────────────────────────────────────────────
    mood: { type: Number, min: 1, max: 5, default: null },
    energy: { type: Number, min: 1, max: 5, default: null },
    stress: { type: Number, min: 1, max: 5, default: null },
    soreness: { type: Number, min: 1, max: 5, default: null },

    // ── Sleep ─────────────────────────────────────────────────────────────
    sleepHours: { type: Number, min: 0, max: 24, default: null },
    sleepQuality: { type: Number, min: 1, max: 5, default: null },

    // ── Body ──────────────────────────────────────────────────────────────
    weightKg: { type: Number, min: 0, max: 500, default: null },
    waistCm: { type: Number, min: 0, max: 300, default: null },

    // ── Nutrition (light-touch) ───────────────────────────────────────────
    mealsOnPlan: { type: Number, min: 0, max: 10, default: null },
    waterGlasses: { type: Number, min: 0, max: 50, default: null },

    // ── Optional / free text ──────────────────────────────────────────────
    steps: { type: Number, min: 0, default: null },
    note: { type: String, default: "" },
  },
  { timestamps: true },
);

// One log per client per day
LogEntrySchema.index({ clientId: 1, date: 1 }, { unique: true });

// ── Virtuals ──────────────────────────────────────────────────────────────
// totalDuration: prefer categoryDurations (new shape); fall back to summing
// inline durations on workouts (legacy shape).
LogEntrySchema.virtual("totalDuration").get(function () {
  const fromCats = (this.categoryDurations ?? []).reduce(
    (sum, c) => sum + (c.durationMinutes || 0),
    0,
  );
  if (fromCats > 0) return fromCats;
  return (this.workouts ?? []).reduce(
    (sum, w) => sum + (w.durationMinutes || 0),
    0,
  );
});

LogEntrySchema.set("toJSON", { virtuals: true });
LogEntrySchema.set("toObject", { virtuals: true });

export default mongoose.model("LogEntry", LogEntrySchema);