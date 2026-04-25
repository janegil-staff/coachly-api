// src/controllers/scoreController.js
import LogEntry from "../models/LogEntry.js";
import DailyScore from "../models/DailyScore.js";

// ── Scoring helpers ─────────────────────────────────────────────────────────

/** Map a 1–5 scale to 0–100. Returns null if value missing. */
function fromFiveScale(v) {
  if (typeof v !== "number") return null;
  return ((v - 1) / 4) * 100;
}

/** Average of numeric values, ignoring nulls. Returns null if all missing. */
function avgIgnoreNull(values) {
  const nums = values.filter((v) => typeof v === "number");
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/** Clamp to [0, 100] and round to nearest integer. */
function score(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}

/** Wellbeing: mood, energy, inverted stress, inverted soreness. */
function wellbeing(log) {
  const moodScore = fromFiveScale(log.mood);
  const energyScore = fromFiveScale(log.energy);
  // Stress and soreness are "bad when high" — invert
  const stressScore =
    typeof log.stress === "number" ? fromFiveScale(6 - log.stress) : null;
  const sorenessScore =
    typeof log.soreness === "number" ? fromFiveScale(6 - log.soreness) : null;

  const avg = avgIgnoreNull([
    moodScore,
    energyScore,
    stressScore,
    sorenessScore,
  ]);
  return score(avg);
}

/** Sleep: hours scored against 7–9h ideal, modulated by quality. */
function sleep(log) {
  const hours = log.sleepHours;
  const quality = log.sleepQuality;

  let hoursScore = null;
  if (typeof hours === "number") {
    if (hours >= 7 && hours <= 9) hoursScore = 100;
    else if (hours >= 6 && hours < 7) hoursScore = 80;
    else if (hours > 9 && hours <= 10) hoursScore = 85;
    else if (hours >= 5 && hours < 6) hoursScore = 60;
    else if (hours > 10 && hours <= 11) hoursScore = 65;
    else if (hours >= 4 && hours < 5) hoursScore = 40;
    else hoursScore = 20;
  }

  const qualityScore = fromFiveScale(quality);
  const avg = avgIgnoreNull([hoursScore, qualityScore]);
  return score(avg);
}

/** Workout: rest days score full, workout days score by volume + effort. */
function workout(log) {
  // Rest days are intentional recovery — full credit.
  if (log.isRestDay) return 100;

  const workouts = log.workouts || [];
  if (!workouts.length) {
    // Not a rest day, no workouts logged — partial credit.
    return 30;
  }

  // Volume component: 30 min ≈ 60, 60 min ≈ 90, 90+ min = 100
  const totalMinutes = workouts.reduce(
    (s, w) => s + (w.durationMinutes || 0),
    0,
  );
  let volumeScore;
  if (totalMinutes >= 90) volumeScore = 100;
  else if (totalMinutes >= 60) volumeScore = 90;
  else if (totalMinutes >= 30) volumeScore = 70;
  else if (totalMinutes >= 15) volumeScore = 50;
  else volumeScore = 30;

  // Effort component (1–5, where higher = harder session, 4 ideal)
  let effortScore = null;
  if (typeof log.effort === "number") {
    // Sweet spot around 3–4. Too easy or too hard both score lower.
    const distance = Math.abs(log.effort - 3.5);
    effortScore = 100 - distance * 25; // 100 at 3.5, 75 at 2.5/4.5, 50 at 1.5/5
  }

  const avg = avgIgnoreNull([volumeScore, effortScore]);
  return score(avg);
}

/** Nutrition: meals on plan + water intake. */
function nutrition(log) {
  let mealsScore = null;
  if (typeof log.mealsOnPlan === "number") {
    // 3+ meals on plan = full credit; scale linearly below
    mealsScore = Math.min(100, (log.mealsOnPlan / 3) * 100);
  }

  let waterScore = null;
  if (typeof log.waterGlasses === "number") {
    // 8 glasses ≈ ideal
    waterScore = Math.min(100, (log.waterGlasses / 8) * 100);
  }

  const avg = avgIgnoreNull([mealsScore, waterScore]);
  // If nothing logged, assume neutral so it doesn't drag composite down too much
  return avg === null ? 50 : score(avg);
}

/** Compute composite score from component scores. */
function composite({
  wellbeingScore,
  sleepScore,
  workoutScore,
  nutritionScore,
}) {
  const weighted =
    wellbeingScore * 0.3 +
    sleepScore * 0.25 +
    workoutScore * 0.25 +
    nutritionScore * 0.2;
  return score(weighted);
}

/** YYYY-MM-DD for a given Date. */
function toDayKey(d) {
  const date = new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Day before the given YYYY-MM-DD string. */
function previousDay(dateStr) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - 1);
  return toDayKey(d);
}

/** Compute the streak ending on `date` for a client. */
async function computeStreak(clientId, date) {
  // Walk backwards day by day until we find a missing log entry.
  let streak = 0;
  let cursor = date;
  // Cap at 365 to prevent infinite loops on bad data
  for (let i = 0; i < 365; i += 1) {
    const exists = await LogEntry.exists({ clientId, date: cursor });
    if (!exists) break;
    streak += 1;
    cursor = previousDay(cursor);
  }
  return streak;
}

/** Build a DailyScore-shaped object from a LogEntry. */
function scoreFromLog(log, streakDay) {
  const wellbeingScore = wellbeing(log);
  const sleepScore = sleep(log);
  const workoutScore = workout(log);
  const nutritionScore = nutrition(log);
  const compositeScore = composite({
    wellbeingScore,
    sleepScore,
    workoutScore,
    nutritionScore,
  });
  return {
    wellbeingScore,
    sleepScore,
    workoutScore,
    nutritionScore,
    compositeScore,
    streakDay,
  };
}

// ── Internal helper (also exported for use by logController) ────────────────

/**
 * Recompute and upsert the DailyScore for a single (clientId, date).
 * Call this from logController after creating/updating a LogEntry.
 */
export async function upsertScoreForLog(clientId, date) {
  const log = await LogEntry.findOne({ clientId, date }).lean();
  if (!log) {
    // No log for this day — remove any stale score
    await DailyScore.deleteOne({ clientId, date });
    return null;
  }

  const streakDay = await computeStreak(clientId, date);
  const scoreData = scoreFromLog(log, streakDay);

  const updated = await DailyScore.findOneAndUpdate(
    { clientId, date },
    { $set: { ...scoreData, clientId, date } },
    { new: true, upsert: true },
  );
  return updated;
}

// ── HTTP handlers ───────────────────────────────────────────────────────────

/**
 * POST /api/scores/recompute
 * Body: { date?: "YYYY-MM-DD" }
 *
 * Recompute the score for one date (defaults to today). Useful from a
 * "save log" flow if you don't want to wire upsertScoreForLog directly.
 */
export async function recomputeOne(req, res, next) {
  try {
    const clientId = req.user._id;
    const date = req.body?.date || toDayKey(new Date());

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid date format" });
    }

    const updated = await upsertScoreForLog(clientId, date);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/scores/recompute-all
 *
 * Recompute scores across the client's full log history. Run after
 * scoring-logic changes or as a backfill.
 */
export async function recomputeAll(req, res, next) {
  try {
    const clientId = req.user._id;
    const logs = await LogEntry.find({ clientId }).select("date").lean();

    let count = 0;
    for (const log of logs) {
      await upsertScoreForLog(clientId, log.date);
      count += 1;
    }

    res.json({ success: true, data: { recomputed: count } });
  } catch (err) {
    next(err);
  }
}

export async function getScores(req, res, next) {
  try {
    const clientId = req.user._id;
    const { from, to } = req.query;

    const filter = { clientId };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }

    const scores = await DailyScore.find(filter).sort({ date: 1 }).lean();
    res.json({ scores });
  } catch (err) {
    next(err);
  }
}
/**
 * GET /api/scores/today
 *
 * Convenience: returns today's score (or null if not yet computed).
 */
export async function getTodayScore(req, res, next) {
  try {
    const clientId = req.user._id;
    const today = toDayKey(new Date());
    const score = await DailyScore.findOne({ clientId, date: today }).lean();
    res.json({ success: true, data: score });
  } catch (err) {
    next(err);
  }
}
