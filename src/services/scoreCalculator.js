// src/services/scoreCalculator.js
// Maps a LogEntry to component scores (0-100 each) and a composite score.
// Workout score is tier-smoothed by minutes and multiplied by effort.

const WEIGHTS = {
  wellbeing: 0.35,
  sleep: 0.25,
  workout: 0.25,
  nutrition: 0.15,
};

function scale1to5(val) {
  if (val == null) return null;
  return Math.max(0, Math.min(100, ((val - 1) / 4) * 100));
}

function computeWellbeingScore(entry) {
  const parts = [
    scale1to5(entry.mood),
    scale1to5(entry.energy),
    entry.stress != null ? 100 - scale1to5(entry.stress) : null,
    entry.soreness != null ? 100 - scale1to5(entry.soreness) : null,
  ].filter((v) => v != null);
  if (!parts.length) return 0;
  return parts.reduce((s, v) => s + v, 0) / parts.length;
}

function computeSleepScore(entry) {
  if (entry.sleepHours == null && entry.sleepQuality == null && entry.sleep == null) return 0;
  let hoursScore = null;
  if (entry.sleepHours != null) {
    const h = entry.sleepHours;
    if (h >= 7 && h <= 9) hoursScore = 100;
    else if (h >= 6 && h < 7) hoursScore = 75;
    else if (h > 9 && h <= 10) hoursScore = 75;
    else if (h >= 5 && h < 6) hoursScore = 50;
    else if (h > 10 && h <= 11) hoursScore = 50;
    else if (h >= 4 && h < 5) hoursScore = 25;
    else hoursScore = 10;
  }
  // Support both 'sleepQuality' and the simpler 'sleep' 1-5 rating.
  const qualityScore = scale1to5(entry.sleepQuality ?? entry.sleep);
  const parts = [hoursScore, qualityScore].filter((v) => v != null);
  if (!parts.length) return 0;
  return parts.reduce((s, v) => s + v, 0) / parts.length;
}

// ── Tier-smoothed workout scoring ──────────────────────────────────────────

export function tierForMinutes(minutes) {
  const m = Number(minutes);
  if (!Number.isFinite(m) || m <= 0) return { name: "none", points: 0 };
  let points;
  let name;
  if (m < 15) {
    name = "light";
    points = m * (10 / 15);
  } else if (m < 45) {
    name = "moderate";
    points = 10 + (m - 15) * (20 / 30);
  } else if (m < 90) {
    name = "hard";
    points = 30 + (m - 45) * (30 / 45);
  } else {
    name = "veryHard";
    points = 60 + (m - 90) * (20 / 90);
    if (points > 80) points = 80;
  }
  return { name, points };
}

export function effortMultiplier(effort) {
  switch (Number(effort)) {
    case 1: return 0.7;
    case 2: return 0.85;
    case 3: return 1.0;
    case 4: return 1.15;
    case 5: return 1.3;
    default: return 1.0;
  }
}

export function computeWorkoutScore(entry) {
  if (!entry) return 0;
  if (entry.isRestDay) return 60;

  const workouts = Array.isArray(entry.workouts) ? entry.workouts : [];
  let rawPoints = 0;
  for (const w of workouts) {
    const m = Number(w?.durationMinutes) || 0;
    rawPoints += tierForMinutes(m).points;
  }
  if (rawPoints === 0) return 0;

  const mult = effortMultiplier(entry.effort);
  const scaled = rawPoints * mult;
  // rawPoints max ≈ 80 per workout at cap; scaled can reach ~104.
  // Clamp to 100 for the composite (which expects 0-100 component scores).
  return Math.min(100, Math.round(scaled));
}

export function describeWorkoutScore(entry) {
  if (!entry || entry.isRestDay) {
    return { points: 0, minutes: 0, tier: "rest", score: entry?.isRestDay ? 60 : 0 };
  }
  const workouts = Array.isArray(entry.workouts) ? entry.workouts : [];
  let rawPoints = 0;
  let minutes = 0;
  let highest = "none";
  const order = ["none", "light", "moderate", "hard", "veryHard"];
  for (const w of workouts) {
    const m = Number(w?.durationMinutes) || 0;
    minutes += m;
    const tier = tierForMinutes(m);
    rawPoints += tier.points;
    if (order.indexOf(tier.name) > order.indexOf(highest)) highest = tier.name;
  }
  const mult = effortMultiplier(entry.effort);
  return {
    points: Math.round(rawPoints),
    minutes,
    tier: highest,
    score: Math.min(100, Math.round(rawPoints * mult)),
  };
}

// ── Nutrition (unchanged) ──────────────────────────────────────────────────

function computeNutritionScore(entry) {
  const parts = [];
  if (entry.mealsOnPlan != null) {
    parts.push(Math.min(100, (entry.mealsOnPlan / 3) * 100));
  }
  if (entry.waterGlasses != null) {
    parts.push(Math.min(100, (entry.waterGlasses / 8) * 100));
  }
  if (!parts.length) return 0;
  return parts.reduce((s, v) => s + v, 0) / parts.length;
}

// ── Composite ──────────────────────────────────────────────────────────────
// If nutrition isn't being tracked at all, redistribute its weight to the
// other three components so the composite isn't artificially dragged down.

export function scoreEntry(entry) {
  const wellbeingScore = Math.round(computeWellbeingScore(entry));
  const sleepScore = Math.round(computeSleepScore(entry));
  const workoutScore = Math.round(computeWorkoutScore(entry));
  const nutritionScore = Math.round(computeNutritionScore(entry));

  const hasNutrition = entry.mealsOnPlan != null || entry.waterGlasses != null;
  const w = hasNutrition
    ? WEIGHTS
    : {
        wellbeing: WEIGHTS.wellbeing / (1 - WEIGHTS.nutrition),
        sleep: WEIGHTS.sleep / (1 - WEIGHTS.nutrition),
        workout: WEIGHTS.workout / (1 - WEIGHTS.nutrition),
        nutrition: 0,
      };

  const compositeScore = Math.round(
    wellbeingScore * w.wellbeing +
      sleepScore * w.sleep +
      workoutScore * w.workout +
      nutritionScore * w.nutrition
  );

  return {
    compositeScore,
    wellbeingScore,
    sleepScore,
    workoutScore,
    nutritionScore,
  };
}
