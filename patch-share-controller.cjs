// patch-share-controller.cjs
// Fixes three bugs in src/controllers/shareController.js:
//
//   1. totalMinutes was summing workouts[].durationMinutes (always 0 with the
//      current mobile shape). Should sum categoryDurations[].durationMinutes
//      and fall back to legacy workout durations.
//
//   2. avgSleep was reading log.sleep — the actual field is sleepQuality.
//      Same bug we already fixed in Dashboard.jsx and stats.js.
//
//   3. The "Last 30 days" comment is stale — the code uses 90 days. Update
//      the comment to match.
//
// Idempotent — safe to re-run.
//
// Run from coachly-api root:
//   node patch-share-controller.cjs

const fs = require("fs");
const path = require("path");

const FILE = path.join("src", "controllers", "shareController.js");
if (!fs.existsSync(FILE)) {
  console.error("✗ Cannot find " + FILE + " — run this from the coachly-api root.");
  process.exit(1);
}

const SENTINEL = "// shareController bugfixes v1";

let src = fs.readFileSync(FILE, "utf8");

if (src.includes(SENTINEL)) {
  console.log("✓ shareController already patched (sentinel found). Nothing to do.");
  process.exit(0);
}

let changes = 0;

// ── Fix 1: totalMinutes — use categoryDurations primarily ──────────────────
const oldTotalMinutes = `    totalMinutes: logs.reduce(
      (s, l) =>
        s + (l.workouts?.reduce((a, w) => a + (w.durationMinutes || 0), 0) || 0),
      0
    ),`;

const newTotalMinutes = `    totalMinutes: logs.reduce((s, l) => {
      // ${SENTINEL}
      // Prefer categoryDurations (current mobile shape); fall back to legacy
      // per-workout durations for old logs.
      const fromCats = (l.categoryDurations || []).reduce(
        (a, c) => a + (c.durationMinutes || 0),
        0
      );
      if (fromCats > 0) return s + fromCats;
      const fromWorkouts = (l.workouts || []).reduce(
        (a, w) => a + (w.durationMinutes || 0),
        0
      );
      return s + fromWorkouts;
    }, 0),`;

if (src.includes(oldTotalMinutes)) {
  src = src.replace(oldTotalMinutes, newTotalMinutes);
  changes++;
  console.log("  ✓ Fixed totalMinutes — now reads from categoryDurations");
} else {
  console.warn("  ⚠ totalMinutes block not found in expected shape — skipping");
}

// ── Fix 2: avgSleep — read sleepQuality, not sleep ─────────────────────────
const oldAvgSleep = `avgSleep: avg(logs, "sleep"),`;
const newAvgSleep = `avgSleep: avg(logs, "sleepQuality"),`;

if (src.includes(oldAvgSleep)) {
  src = src.replace(oldAvgSleep, newAvgSleep);
  changes++;
  console.log("  ✓ Fixed avgSleep — now reads sleepQuality");
} else {
  console.warn("  ⚠ avgSleep line not found in expected shape — skipping");
}

// ── Fix 3: stale comment "Last 30 days" → "Last 90 days" ───────────────────
const oldComment = `  // Last 30 days of logs`;
const newComment = `  // Last 90 days of logs`;

if (src.includes(oldComment)) {
  src = src.replace(oldComment, newComment);
  changes++;
  console.log("  ✓ Fixed stale '30 days' comment to '90 days'");
}

if (changes === 0) {
  console.log("");
  console.log("⚠ No changes made. Either patch already applied, or the file");
  console.log("  has been edited by hand. Inspect manually.");
  process.exit(0);
}

fs.writeFileSync(FILE, src, "utf8");
console.log("");
console.log("✓ Patched " + FILE + " — " + changes + " fix(es) applied.");
console.log("");
console.log("Restart the API:");
console.log("  npm run dev");
console.log("");
console.log("Then refresh the dashboard — totalMinutes should now reflect");
console.log("categoryDurations, and avgSleep should populate.");
