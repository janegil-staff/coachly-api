// src/controllers/scoreController.js
import DailyScore from "../models/DailyScore.js";

/** YYYY-MM-DD for a given Date. */
function toDayKey(d) {
  const date = new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * GET /api/scores?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Returns the authenticated client's daily scores within an optional date range.
 */
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
 * Convenience: returns today's score (or null if not yet computed).
 */
export async function getTodayScore(req, res, next) {
  try {
    const clientId = req.user._id;
    const today = toDayKey(new Date());
    const score = await DailyScore.findOne({ clientId, date: today }).lean();
    res.json({ score });
  } catch (err) {
    next(err);
  }
}