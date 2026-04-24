// Maps a LogEntry to component scores (0-100 each) and a composite score.
// Tunable weights — defaults skew toward wellbeing and sleep since they're
// daily-logged reliably; workout and nutrition are "bonus" drivers.
const WEIGHTS = {
  wellbeing: 0.35,
  sleep: 0.25,
  workout: 0.25,
  nutrition: 0.15,
};

function scale1to5(val) {
  // 1→0, 5→100 (linear). null → null (unreported)
  if (val == null) return null;
  return Math.max(0, Math.min(100, ((val - 1) / 4) * 100));
}

function computeWellbeingScore(entry) {
  const parts = [
    scale1to5(entry.mood),
    scale1to5(entry.energy),
    // Stress and soreness are inverted: lower is better
    entry.stress != null ? 100 - scale1to5(entry.stress) : null,
    entry.soreness != null ? 100 - scale1to5(entry.soreness) : null,
  ].filter((v) => v != null);
  if (!parts.length) return 0;
  return parts.reduce((s, v) => s + v, 0) / parts.length;
}

function computeSleepScore(entry) {
  if (entry.sleepHours == null && entry.sleepQuality == null) return 0;

  // Hours: peak at 7-9h, drop off both sides
  let hoursScore = 0;
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

  const qualityScore = scale1to5(entry.sleepQuality);

  const parts = [hoursScore, qualityScore].filter((v) => v != null);
  return parts.reduce((s, v) => s + v, 0) / parts.length;
}

function computeWorkoutScore(entry) {
  if (!entry.didWorkout) {
    // "rest" is a valid, healthy choice — not zero
    return entry.workoutType === "rest" ? 60 : 0;
  }

  // Did workout: base 70, + intensity bonus, + duration bonus
  let score = 70;
  if (entry.workoutIntensity != null) {
    // Intensity 3 is ideal; 1 or 5 is sub-optimal
    const ideal = 1 - Math.abs(entry.workoutIntensity - 3) / 3;
    score += 15 * ideal;
  }
  if (entry.workoutDurationMin != null) {
    const dur = entry.workoutDurationMin;
    if (dur >= 30 && dur <= 75) score += 15;
    else if (dur >= 20) score += 10;
    else if (dur >= 10) score += 5;
  }
  return Math.min(100, score);
}

function computeNutritionScore(entry) {
  const parts = [];
  if (entry.mealsOnPlan != null) {
    // Assume target is ~3 on-plan meals; scale against that
    parts.push(Math.min(100, (entry.mealsOnPlan / 3) * 100));
  }
  if (entry.waterGlasses != null) {
    // Target ~8 glasses
    parts.push(Math.min(100, (entry.waterGlasses / 8) * 100));
  }
  if (!parts.length) return 0;
  return parts.reduce((s, v) => s + v, 0) / parts.length;
}

export function scoreEntry(entry) {
  const wellbeingScore = Math.round(computeWellbeingScore(entry));
  const sleepScore = Math.round(computeSleepScore(entry));
  const workoutScore = Math.round(computeWorkoutScore(entry));
  const nutritionScore = Math.round(computeNutritionScore(entry));

  const compositeScore = Math.round(
    wellbeingScore * WEIGHTS.wellbeing +
      sleepScore * WEIGHTS.sleep +
      workoutScore * WEIGHTS.workout +
      nutritionScore * WEIGHTS.nutrition,
  );

  return {
    compositeScore,
    wellbeingScore,
    sleepScore,
    workoutScore,
    nutritionScore,
  };
}
