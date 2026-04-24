/**
 * Dev seed script — populates a local DB with a test coach, client,
 * an active relationship, 30 days of varied log entries, and a handful
 * of workouts.
 *
 * Usage:
 *   npm run seed           # adds seed data (fails if test accounts already exist)
 *   npm run seed:reset     # wipes everything first, then seeds
 *
 * Test credentials (after seeding):
 *   Coach:  coach@coachly.test  / password: Coachly123!
 *   Client: client@coachly.test / password: Coachly123!
 */
import mongoose from "mongoose";
import { connectDb, disconnectDb } from "../src/config/db.js";
import User from "../src/models/User.js";
import CoachingRelationship from "../src/models/CoachingRelationship.js";
import LogEntry from "../src/models/LogEntry.js";
import Workout from "../src/models/Workout.js";
import DailyScore from "../src/models/DailyScore.js";
import Message from "../src/models/Message.js";
import { scoreEntry } from "../src/services/scoreCalculator.js";
import {
  generateUniqueInviteCode,
  defaultInviteExpiry,
} from "../src/services/inviteCode.js";

const COACH_EMAIL = "coach@coachly.test";
const CLIENT_EMAIL = "client@coachly.test";
const PASSWORD = "Coachly123!";

function daysAgoDateString(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Gentle trend: early days rough, middle days OK, recent days solid
function fakeLog(dayOffset) {
  const trend = 1 - dayOffset / 30; // 0 at day-30, 1 at today
  const jitter = () => Math.random() * 0.6 - 0.3;

  const mood = Math.max(1, Math.min(5, Math.round(2 + trend * 2 + jitter())));
  const energy = Math.max(1, Math.min(5, Math.round(2 + trend * 2.5 + jitter())));
  const stress = Math.max(1, Math.min(5, Math.round(4 - trend * 2 + jitter())));
  const soreness = Math.max(1, Math.min(5, Math.round(3 + jitter())));
  const sleepHours = +(6 + trend * 1.5 + Math.random() * 1.5 - 0.5).toFixed(1);
  const sleepQuality = Math.max(
    1,
    Math.min(5, Math.round(2.5 + trend * 1.5 + jitter())),
  );

  const didWorkout = Math.random() < 0.5 + trend * 0.3; // more consistent over time
  const types = ["strength", "cardio", "mobility", "mixed"];
  const workoutType = didWorkout
    ? types[Math.floor(Math.random() * types.length)]
    : dayOffset % 7 === 0
      ? "rest"
      : null;

  return {
    mood,
    energy,
    stress,
    soreness,
    sleepHours,
    sleepQuality,
    weightKg: +(78 - trend * 2.5 + Math.random() * 0.6 - 0.3).toFixed(1),
    waistCm: +(88 - trend * 3 + Math.random() * 0.5).toFixed(1),
    didWorkout,
    workoutType,
    workoutDurationMin: didWorkout
      ? 30 + Math.floor(Math.random() * 40)
      : null,
    workoutIntensity: didWorkout
      ? Math.max(1, Math.min(5, Math.round(3 + Math.random() * 1.5 - 0.75)))
      : null,
    workoutNotes: didWorkout && Math.random() < 0.3 ? "Felt strong today" : "",
    mealsOnPlan: Math.max(0, Math.min(4, Math.round(2 + trend + jitter()))),
    waterGlasses: Math.max(0, Math.round(5 + trend * 3 + Math.random() * 2)),
    steps: Math.round(4000 + trend * 5000 + Math.random() * 3000),
    note: "",
  };
}

async function run() {
  const reset = process.argv.includes("--reset");
  await connectDb();

  if (reset) {
    console.log("[seed] --reset: wiping collections...");
    await Promise.all([
      User.deleteMany({}),
      CoachingRelationship.deleteMany({}),
      LogEntry.deleteMany({}),
      Workout.deleteMany({}),
      DailyScore.deleteMany({}),
      Message.deleteMany({}),
    ]);
  }

  const existing = await User.findOne({ email: COACH_EMAIL });
  if (existing && !reset) {
    console.log(
      "[seed] test coach already exists. Use `npm run seed:reset` to wipe and reseed.",
    );
    await disconnectDb();
    return;
  }

  // ── Coach ────────────────────────────────────────────────────────────
  const coachPasswordHash = await User.hashPassword(PASSWORD);
  const coach = await User.create({
    email: COACH_EMAIL,
    passwordHash: coachPasswordHash,
    role: "coach",
    name: "Alex Coach",
    language: "en",
    coachProfile: {
      specialties: ["strength", "weight-loss"],
      bio: "Certified personal trainer with 8 years of experience.",
      certifications: ["NASM-CPT", "Precision Nutrition L1"],
      maxClients: 5,
      isPro: false,
    },
  });

  // ── Client ───────────────────────────────────────────────────────────
  const clientPasswordHash = await User.hashPassword(PASSWORD);
  const client = await User.create({
    email: CLIENT_EMAIL,
    passwordHash: clientPasswordHash,
    role: "client",
    name: "Sam Client",
    language: "en",
    clientProfile: {
      dob: new Date("1990-06-15"),
      heightCm: 178,
      goalType: "lose_fat",
      activityLevel: "moderate",
      coachId: coach._id,
    },
  });

  // ── Relationship ─────────────────────────────────────────────────────
  const inviteCode = await generateUniqueInviteCode();
  const rel = await CoachingRelationship.create({
    coachId: coach._id,
    clientId: client._id,
    inviteCode,
    inviteCodeExpiresAt: defaultInviteExpiry(),
    status: "active",
    startedAt: new Date(),
    coachNotes:
      "Goal: lose 5kg over 12 weeks. Loves strength training, struggles with nutrition consistency.",
  });

  // ── 30 days of logs + daily scores ───────────────────────────────────
  const logOps = [];
  const scoreOps = [];
  for (let i = 29; i >= 0; i--) {
    const date = daysAgoDateString(i);
    const fields = fakeLog(i);
    logOps.push({
      clientId: client._id,
      date,
      ...fields,
    });
  }
  const createdLogs = await LogEntry.insertMany(logOps);

  for (const log of createdLogs) {
    const scores = scoreEntry(log);
    scoreOps.push({
      clientId: client._id,
      date: log.date,
      ...scores,
      streakDay: 0, // populated below
    });
  }
  // Compute streaks — simple: since all 30 days logged, streak increases by 1 each day
  scoreOps.sort((a, b) => (a.date < b.date ? -1 : 1));
  scoreOps.forEach((s, idx) => {
    s.streakDay = idx + 1;
  });
  await DailyScore.insertMany(scoreOps);

  // ── A few workouts ───────────────────────────────────────────────────
  const workoutOps = [];
  for (let i = 0; i < 8; i++) {
    const offset = i * 3 + 1; // roughly every 3 days
    const date = daysAgoDateString(offset);
    workoutOps.push({
      coachId: coach._id,
      clientId: client._id,
      assignedDate: date,
      title: i % 2 === 0 ? "Upper body push" : "Lower body strength",
      exercises:
        i % 2 === 0
          ? [
              { name: "Barbell bench press", sets: 4, reps: 8, weightKg: 60 },
              { name: "Overhead press", sets: 3, reps: 10, weightKg: 35 },
              { name: "Incline dumbbell press", sets: 3, reps: 12, weightKg: 20 },
              { name: "Tricep pushdown", sets: 3, reps: 12, weightKg: 25 },
            ]
          : [
              { name: "Back squat", sets: 4, reps: 6, weightKg: 90 },
              { name: "Romanian deadlift", sets: 3, reps: 10, weightKg: 70 },
              { name: "Walking lunges", sets: 3, reps: 20, weightKg: 15 },
              { name: "Seated calf raise", sets: 4, reps: 15, weightKg: 40 },
            ],
      completed: offset > 2,
      completedAt: offset > 2 ? new Date() : null,
      clientRpe: offset > 2 ? 7 + Math.floor(Math.random() * 2) : null,
    });
  }

  // A couple of templates
  workoutOps.push({
    coachId: coach._id,
    clientId: coach._id,
    title: "Full body beginner",
    assignedDate: "1970-01-01",
    isTemplate: true,
    templateName: "Full body A",
    exercises: [
      { name: "Goblet squat", sets: 3, reps: 10 },
      { name: "Push-up", sets: 3, reps: 10 },
      { name: "Bent-over row", sets: 3, reps: 10 },
      { name: "Plank", sets: 3, durationMin: 1 },
    ],
  });

  await Workout.insertMany(workoutOps);

  // ── A handful of messages ────────────────────────────────────────────
  await Message.insertMany([
    {
      relationshipId: rel._id,
      senderId: coach._id,
      text: "Welcome! I've set up your first week of workouts. Log daily so I can see how you're feeling.",
    },
    {
      relationshipId: rel._id,
      senderId: client._id,
      text: "Thanks! Just finished today's session, legs are toast.",
    },
    {
      relationshipId: rel._id,
      senderId: coach._id,
      text: "Good — that's the goal. Make sure you hit 2L water and 8h sleep tonight.",
    },
  ]);

  console.log("\n✅ Seed complete.\n");
  console.log("   Coach:  ", COACH_EMAIL, "/", PASSWORD);
  console.log("   Client: ", CLIENT_EMAIL, "/", PASSWORD);
  console.log("   Invite: ", inviteCode);
  console.log("   Logs:    30 days");
  console.log("   Workouts:", workoutOps.length);
  console.log("");

  await disconnectDb();
}

run().catch(async (err) => {
  console.error("[seed] failed:", err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
