// Maps a LogEntry to component scores (0-100 each) and a composite score.
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
    // Stress and soreness are inverted: lower is better
    entry.stress != null ? 100 - scale1to5(entry.stress) : null,
    entry.soreness != null ? 100 - scale1to5(entry.soreness) : null,
  ].filter((v) => v != null);
  if (!parts.length) return 0;
  return parts.reduce((s, v) => s + v, 0) / parts.length;
}

function computeSleepScore(entry) {
  if (entry.sleepHours == null && entry.sleepQuality == null) return 0;

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

  const qualityScore = scale1to5(entry.sleepQuality);

  const parts = [hoursScore, qualityScore].filter((v) => v != null);
  if (!parts.length) return 0;
  return parts.reduce((s, v) => s + v, 0) / parts.length;
}

function computeWorkoutScore(entry) {
  if (entry.isRestDay) {
    // Rest is a healthy, valid choice — not zero
    return 60;
  }

  const workouts = entry.workouts ?? [];
  if (workouts.length === 0) return 0;

  const totalDuration = workouts.reduce(
    (sum, w) => sum + (w.durationMinutes || 0),
    0,
  );

  // Base for logging any workout
  let score = 70;

  // Effort bonus (3 is ideal)
  if (entry.effort != null) {
    const ideal = 1 - Math.abs(entry.effort - 3) / 3;
    score += 15 * ideal;
  }

  // Duration bonus
  if (totalDuration >= 30 && totalDuration <= 90) score += 15;
  else if (totalDuration >= 20) score += 10;
  else if (totalDuration >= 10) score += 5;

  // Variety bonus: multiple workout types in one day
  const uniqueTypes = new Set(workouts.map((w) => w.type)).size;
  if (uniqueTypes >= 2) score += 5;

  return Math.min(100, score);
}

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
