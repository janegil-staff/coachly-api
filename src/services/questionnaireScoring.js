// src/services/questionnaireScoring.js
// Hooper Index: 4 sliders (sleep quality, fatigue, stress, muscle soreness) rated 1-7.
// Total score = sum (4-28). Higher = more fatigue/stress (worse).
// Reference: Hooper SL, Mackinnon LT (1995).

export function scoreHooper(answers) {
  if (!Array.isArray(answers) || answers.length !== 4) {
    throw new Error("Hooper requires exactly 4 answers");
  }
  for (const a of answers) {
    if (typeof a !== "number" || a < 1 || a > 7) {
      throw new Error("Hooper answers must be numbers 1-7");
    }
  }
  const [sleep, fatigue, stress, soreness] = answers;
  const total = sleep + fatigue + stress + soreness;
  return {
    sleep,
    fatigue,
    stress,
    soreness,
    total,
    // Bucketed: ≤8 fresh, 9-14 normal, 15-20 strained, 21+ overreaching
    status: total <= 8 ? "fresh" : total <= 14 ? "normal" : total <= 20 ? "strained" : "overreaching",
  };
}

// RESTQ-Sport-36: 12 subscales × 3 items, 0-6 Likert.
// Subscale score = mean of 3 items. Total stress/recovery = mean of relevant subscales.
// [PLACEHOLDER scoring — real items belong to Kellmann & Kallus; obtain license for production.]
export const RESTQ_SUBSCALES = [
  { id: "generalStress", side: "stress", items: [0, 1, 2] },
  { id: "emotionalStress", side: "stress", items: [3, 4, 5] },
  { id: "socialStress", side: "stress", items: [6, 7, 8] },
  { id: "conflictsPressure", side: "stress", items: [9, 10, 11] },
  { id: "fatigue", side: "stress", items: [12, 13, 14] },
  { id: "lackOfEnergy", side: "stress", items: [15, 16, 17] },
  { id: "success", side: "recovery", items: [18, 19, 20] },
  { id: "socialRecovery", side: "recovery", items: [21, 22, 23] },
  { id: "physicalRecovery", side: "recovery", items: [24, 25, 26] },
  { id: "generalWellBeing", side: "recovery", items: [27, 28, 29] },
  { id: "sleepQuality", side: "recovery", items: [30, 31, 32] },
  { id: "selfEfficacy", side: "recovery", items: [33, 34, 35] },
];

export function scoreRestq(answers) {
  if (!Array.isArray(answers) || answers.length !== 36) {
    throw new Error("RESTQ requires exactly 36 answers");
  }
  for (const a of answers) {
    if (typeof a !== "number" || a < 0 || a > 6) {
      throw new Error("RESTQ answers must be numbers 0-6");
    }
  }
  const subscaleScores = {};
  let stressTotal = 0, stressCount = 0;
  let recoveryTotal = 0, recoveryCount = 0;
  for (const sub of RESTQ_SUBSCALES) {
    const mean = sub.items.reduce((s, i) => s + answers[i], 0) / sub.items.length;
    subscaleScores[sub.id] = Math.round(mean * 100) / 100;
    if (sub.side === "stress") { stressTotal += mean; stressCount++; }
    else { recoveryTotal += mean; recoveryCount++; }
  }
  const stress = Math.round((stressTotal / stressCount) * 100) / 100;
  const recovery = Math.round((recoveryTotal / recoveryCount) * 100) / 100;
  return {
    subscales: subscaleScores,
    stress,
    recovery,
    balance: Math.round((recovery - stress) * 100) / 100,
  };
}
