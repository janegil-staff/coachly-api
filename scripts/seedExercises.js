// seed/seedExercises.js
// Run with: node seed/seedExercises.js
// Idempotent — safe to run multiple times. Uses slug as the unique key.

import mongoose from "mongoose";
import dotenv from "dotenv";
import Exercise from "../src/models/Exercise.js";

dotenv.config();

const CATALOG = [
  // ── STRENGTH ───────────────────────────────────────────────────────────
  {
    slug: "bench_press",
    name: "Bench press",
    category: "strength",
    defaultUnit: "kg",
  },
  {
    slug: "incline_bench_press",
    name: "Incline bench press",
    category: "strength",
    defaultUnit: "kg",
  },
  { slug: "squat", name: "Squat", category: "strength", defaultUnit: "kg" },
  {
    slug: "front_squat",
    name: "Front squat",
    category: "strength",
    defaultUnit: "kg",
  },
  {
    slug: "deadlift",
    name: "Deadlift",
    category: "strength",
    defaultUnit: "kg",
  },
  {
    slug: "romanian_deadlift",
    name: "Romanian deadlift",
    category: "strength",
    defaultUnit: "kg",
  },
  {
    slug: "overhead_press",
    name: "Overhead press",
    category: "strength",
    defaultUnit: "kg",
  },
  {
    slug: "barbell_row",
    name: "Barbell row",
    category: "strength",
    defaultUnit: "kg",
  },
  {
    slug: "dumbbell_row",
    name: "Dumbbell row",
    category: "strength",
    defaultUnit: "kg",
  },
  {
    slug: "dumbbell_curl",
    name: "Dumbbell curl",
    category: "strength",
    defaultUnit: "kg",
  },
  {
    slug: "tricep_extension",
    name: "Tricep extension",
    category: "strength",
    defaultUnit: "kg",
  },
  {
    slug: "lat_pulldown",
    name: "Lat pulldown",
    category: "strength",
    defaultUnit: "kg",
  },
  {
    slug: "pull_up",
    name: "Pull-up",
    category: "strength",
    defaultUnit: "reps",
  },
  {
    slug: "push_up",
    name: "Push-up",
    category: "strength",
    defaultUnit: "reps",
  },
  { slug: "lunge", name: "Lunge", category: "strength", defaultUnit: "kg" },
  {
    slug: "bulgarian_split_squat",
    name: "Bulgarian split squat",
    category: "strength",
    defaultUnit: "kg",
  },
  {
    slug: "leg_press",
    name: "Leg press",
    category: "strength",
    defaultUnit: "kg",
  },
  {
    slug: "hip_thrust",
    name: "Hip thrust",
    category: "strength",
    defaultUnit: "kg",
  },
  {
    slug: "lateral_raise",
    name: "Lateral raise",
    category: "strength",
    defaultUnit: "kg",
  },
  { slug: "plank", name: "Plank", category: "strength", defaultUnit: "min" },

  // ── CARDIO ─────────────────────────────────────────────────────────────
  { slug: "running", name: "Running", category: "cardio", defaultUnit: "min" },
  { slug: "cycling", name: "Cycling", category: "cardio", defaultUnit: "min" },
  { slug: "rowing", name: "Rowing", category: "cardio", defaultUnit: "min" },
  {
    slug: "swimming",
    name: "Swimming",
    category: "cardio",
    defaultUnit: "min",
  },
  {
    slug: "elliptical",
    name: "Elliptical",
    category: "cardio",
    defaultUnit: "min",
  },
  {
    slug: "jump_rope",
    name: "Jump rope",
    category: "cardio",
    defaultUnit: "min",
  },
  {
    slug: "stair_climber",
    name: "Stair climber",
    category: "cardio",
    defaultUnit: "min",
  },
  { slug: "walking", name: "Walking", category: "cardio", defaultUnit: "min" },
  { slug: "hiking", name: "Hiking", category: "cardio", defaultUnit: "min" },
  { slug: "hiit", name: "HIIT", category: "cardio", defaultUnit: "min" },

  // ── MOBILITY ───────────────────────────────────────────────────────────
  { slug: "yoga", name: "Yoga", category: "mobility", defaultUnit: "min" },
  {
    slug: "stretching",
    name: "Stretching",
    category: "mobility",
    defaultUnit: "min",
  },
  {
    slug: "foam_rolling",
    name: "Foam rolling",
    category: "mobility",
    defaultUnit: "min",
  },
  {
    slug: "hip_openers",
    name: "Hip openers",
    category: "mobility",
    defaultUnit: "min",
  },
  {
    slug: "shoulder_mobility",
    name: "Shoulder mobility",
    category: "mobility",
    defaultUnit: "min",
  },
  {
    slug: "thoracic_rotation",
    name: "Thoracic rotation",
    category: "mobility",
    defaultUnit: "min",
  },
  {
    slug: "cat_cow",
    name: "Cat-cow",
    category: "mobility",
    defaultUnit: "min",
  },
  {
    slug: "pigeon_pose",
    name: "Pigeon pose",
    category: "mobility",
    defaultUnit: "min",
  },

  // ── RECOVERY ───────────────────────────────────────────────────────────
  { slug: "sauna", name: "Sauna", category: "recovery", defaultUnit: "min" },
  {
    slug: "ice_bath",
    name: "Ice bath / cold plunge",
    category: "recovery",
    defaultUnit: "min",
  },
  {
    slug: "massage",
    name: "Massage",
    category: "recovery",
    defaultUnit: "min",
  },
  {
    slug: "light_walk",
    name: "Light walk",
    category: "recovery",
    defaultUnit: "min",
  },
  {
    slug: "breathwork",
    name: "Breathwork",
    category: "recovery",
    defaultUnit: "min",
  },
  {
    slug: "mobility_flow",
    name: "Mobility flow",
    category: "recovery",
    defaultUnit: "min",
  },
];

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected. Seeding catalog…");

  let created = 0;
  let updated = 0;

  for (const item of CATALOG) {
    const existing = await Exercise.findOne({
      slug: item.slug,
      isCustom: false,
    });
    if (existing) {
      // Refresh name/category in case the catalog evolved
      existing.name = item.name;
      existing.category = item.category;
      existing.defaultUnit = item.defaultUnit;
      await existing.save();
      updated++;
    } else {
      await Exercise.create({ ...item, isCustom: false, patient: null });
      created++;
    }
  }

  console.log(`Done. Created ${created}, updated ${updated}.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
