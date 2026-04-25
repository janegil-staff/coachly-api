// src/controllers/questionnaireController.js
import Questionnaire from "../models/Questionnaire.js";
import { scoreHooper, scoreRestq } from "../services/questionnaireScoring.js";
import { BadRequestError, NotFoundError } from "../utils/errors.js";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// POST /api/questionnaires { type, answers, date? }
export async function submitQuestionnaire(req, res) {
  const { type, answers, date } = req.body || {};
  if (!type || (type !== "hooper" && type !== "restq")) {
    throw new BadRequestError("type must be 'hooper' or 'restq'");
  }
  if (!Array.isArray(answers)) {
    throw new BadRequestError("answers must be an array");
  }
  let scores;
  try {
    scores = type === "hooper" ? scoreHooper(answers) : scoreRestq(answers);
  } catch (e) {
    throw new BadRequestError(e.message);
  }
  const dateStr = typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : todayStr();
  const doc = await Questionnaire.findOneAndUpdate(
    { userId: req.user._id, type, date: dateStr },
    { userId: req.user._id, type, date: dateStr, answers, scores },
    { new: true, upsert: true }
  );
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
  const item = await Questionnaire.findOne({ userId: req.user._id, type }).sort({ date: -1 }).lean();
  res.json(item || null);
}
