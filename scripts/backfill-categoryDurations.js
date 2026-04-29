// scripts/backfill-categoryDurations.js
//
// Backfills `categoryDurations` on existing LogEntry docs by aggregating
// `workouts[].durationMinutes` per `workouts[].type`. Old logs predate the
// `categoryDurations` field, so without this they show up empty in the edit
// view of LogEntryScreen step 3.
//
// USAGE:
//   cd coachly-api
//   node scripts/backfill-categoryDurations.js              # dry-run
//   node scripts/backfill-categoryDurations.js --apply      # actually write
//
// Requires MONGODB_URI in env (or .env loaded by your normal app entrypoint).

import "dotenv/config";
import mongoose from "mongoose";
import LogEntry from "../src/models/LogEntry.js";

const APPLY = process.argv.includes("--apply");

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error("Missing MONGODB_URI in env");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB");
  console.log(APPLY ? "Mode: APPLY (writing changes)" : "Mode: DRY-RUN");

  // Find candidates: docs where categoryDurations is empty/missing AND
  // workouts has at least one entry with a durationMinutes value.
  const candidates = await LogEntry.find({
    $and: [
      {
        $or: [
          { categoryDurations: { $exists: false } },
          { categoryDurations: { $size: 0 } },
        ],
      },
      { "workouts.0": { $exists: true } },
    ],
  }).lean();

  console.log(`Found ${candidates.length} candidate log entries`);

  let updated = 0;
  let skipped = 0;

  for (const doc of candidates) {
    const byType = {};
    for (const w of doc.workouts ?? []) {
      if (!w?.type) continue;
      const dur = Number(w.durationMinutes) || 0;
      // Sum durations for the same type (handles multi-row legacy entries).
      byType[w.type] = (byType[w.type] ?? 0) + dur;
    }

    const categoryDurations = Object.entries(byType)
      .filter(([, durationMinutes]) => durationMinutes > 0)
      .map(([type, durationMinutes]) => ({ type, durationMinutes }));

    if (categoryDurations.length === 0) {
      skipped++;
      continue;
    }

    console.log(
      `  ${doc.date} (${doc._id}): ` +
        categoryDurations
          .map((c) => `${c.type}=${c.durationMinutes}m`)
          .join(", "),
    );

    if (APPLY) {
      await LogEntry.updateOne(
        { _id: doc._id },
        { $set: { categoryDurations } },
      );
      updated++;
    }
  }

  console.log("");
  console.log(`Skipped (no usable durations): ${skipped}`);
  if (APPLY) {
    console.log(`Updated: ${updated}`);
  } else {
    console.log(`Would update: ${candidates.length - skipped}`);
    console.log("Re-run with --apply to write changes.");
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
