// src/controllers/questionnaireController.js
import Questionnaire from "../models/Questionnaire.js";
import { scoreHooper, scoreRestq } from "../services/questionnaireScoring.js";
import { BadRequestError, NotFoundError } from "../utils/errors.js";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// POST /api/questionnaires { type, answers, date?, scores? }
export async function submitQuestionnaire(req, res) {
  console.log("======================================");
  console.log("[DEBUG] submitQuestionnaire called");
  console.log("[DEBUG] body keys:", Object.keys(req.body || {}));
  console.log("[DEBUG] req.body.scores:", JSON.stringify(req.body?.scores));
  console.log("[DEBUG] req.body.score:", JSON.stringify(req.body?.score));
  console.log("======================================");

  const { type, answers, date } = req.body || {};
  const ALLOWED_TYPES = [
    "goals",
    "trainingReview",
    "bodyInjury",
    "burnoutRisk",
    "hooper",
    "restq",
    "pss10",
    "psqi",
    "ipaq"
  ];
  if (!type || !ALLOWED_TYPES.includes(type)) {
    throw new BadRequestError(
      `type must be one of: ${ALLOWED_TYPES.join(", ")}`,
    );
  }
  if (!Array.isArray(answers)) {
    throw new BadRequestError("answers must be an array");
  }

  let scores;
  try {
    if (type === "hooper") {
      scores = scoreHooper(answers);
    } else if (type === "restq") {
      scores = scoreRestq(answers);
    } else {
      // goals / trainingReview / bodyInjury / burnoutRisk:
      // The mobile app computes the score and sends it in req.body.scores.
      scores = req.body.scores ?? req.body.score ?? null;
      console.log("[DEBUG] computed scores to store:", JSON.stringify(scores));
    }
  } catch (e) {
    throw new BadRequestError(e.message);
  }

  const dateStr =
    typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? date
      : todayStr();

  console.log("[DEBUG] about to upsert with scores:", JSON.stringify(scores));

  const doc = await Questionnaire.findOneAndUpdate(
    { userId: req.user._id, type, date: dateStr },
    { userId: req.user._id, type, date: dateStr, answers, scores },
    { new: true, upsert: true },
  );

  console.log("[DEBUG] saved doc.scores:", JSON.stringify(doc.scores));

  res.json(doc);
}

// GET /api/questionnaires?type=hooper&limit=30
export async function listQuestionnaires(req, res) {
  const { type, limit = "30" } = req.query || {};
  const q = { userId: req.user._id };
  if (type) q.type = type;
  const n = Math.min(Math.max(parseInt(limit, 10) || 30, 1), 365);
  const items = await Questionnaire.find(q).sort({ date: -1 }).limit(n).lean();
  res.json(items);
}

// GET /api/questionnaires/latest?type=hooper
export async function latestQuestionnaire(req, res) {
  const { type } = req.query || {};
  if (!type) throw new BadRequestError("type required");
  const item = await Questionnaire.findOne({ userId: req.user._id, type })
    .sort({ date: -1 })
    .lean();
  res.json(item || null);
}
