// src/controllers/shareController.js
import ShareCode from "../models/ShareCode.js";
import LogEntry from "../models/LogEntry.js";
import DailyScore from "../models/DailyScore.js";
import User from "../models/User.js";
import Questionnaire from "../models/Questionnaire.js";
import { BadRequestError, NotFoundError } from "../utils/errors.js";

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 8;

function randomDigits(n) {
  let s = "";
  for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 10);
  return s;
}

// POST /api/share  { includeNotes }  (requires auth)
export async function createShareCode(req, res) {
  const { includeNotes = true } = req.body || {};

  // Invalidate any existing codes for this user — one active code at a time.
  await ShareCode.deleteMany({ userId: req.user._id });

  // Generate a unique 6-digit code
  let code = null;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const candidate = randomDigits(6);
    const clash = await ShareCode.findOne({ code: candidate });
    if (!clash) { code = candidate; break; }
  }
  if (!code) {
    throw new BadRequestError("Could not generate a unique share code");
  }

  const expiresAt = new Date(Date.now() + CODE_TTL_MS);
  await ShareCode.create({
    code,
    userId: req.user._id,
    includeNotes: !!includeNotes,
    expiresAt,
  });

  res.json({ code, expiresAt, includeNotes: !!includeNotes });
}

// GET /api/share/:code  (no auth — that's the point of the code)
export async function fetchShareReport(req, res) {
  const { code } = req.params;
  const entry = await ShareCode.findOne({ code });
  if (!entry) throw new NotFoundError("Share code not found or expired");
  if (entry.expiresAt < new Date()) {
    throw new NotFoundError("Share code has expired");
  }

  const user = await User.findById(entry.userId).select(
    "email language clientProfile createdAt"
  );
  if (!user) throw new NotFoundError("User not found");

  // Last 30 days of logs
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const rawLogs = await LogEntry.find({
    clientId: entry.userId,
    date: { $gte: cutoffStr },
  })
    .sort({ date: 1 })
    .lean();

  // Strip notes if includeNotes=false
  const logs = rawLogs.map((l) => {
    const out = { ...l };
    if (!entry.includeNotes) delete out.note;
    return out;
  });

  // Daily scores over the window
  const scores = await DailyScore.find({
    clientId: entry.userId,
    date: { $gte: cutoffStr },
  })
    .sort({ date: 1 })
    .lean();

  // Aggregate stats
  const nonRest = logs.filter((l) => !l.isRestDay);
  const avg = (arr, key) => {
    const vals = arr.map((l) => l?.[key]).filter((v) => typeof v === "number");
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
  };
  const typeCounts = {};
  logs.forEach((l) =>
    (l.workouts || []).forEach((w) => {
      if (w?.type) typeCounts[w.type] = (typeCounts[w.type] || 0) + 1;
    })
  );
  const topType =
    Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const stats = {
    sessionsLogged: nonRest.length,
    restDays: logs.length - nonRest.length,
    avgEffort: avg(nonRest, "effort"),
    avgMood: avg(logs, "mood"),
    avgEnergy: avg(logs, "energy"),
    avgSleep: avg(logs, "sleep"),
    avgSoreness: avg(logs, "soreness"),
    topWorkoutType: topType,
    totalWorkouts: logs.reduce((s, l) => s + (l.workouts?.length || 0), 0),
    totalMinutes: logs.reduce(
      (s, l) =>
        s + (l.workouts?.reduce((a, w) => a + (w.durationMinutes || 0), 0) || 0),
      0
    ),
    windowStart: cutoffStr,
    windowEnd: new Date().toISOString().slice(0, 10),
  };

  // Latest questionnaires (Hooper + RESTQ)
  const [latestHooper, latestRestq] = await Promise.all([
    Questionnaire.findOne({ userId: entry.userId, type: "hooper" }).sort({ date: -1 }).lean(),
    Questionnaire.findOne({ userId: entry.userId, type: "restq" }).sort({ date: -1 }).lean(),
  ]);

  res.json({
    client: {
      email: user.email,
      language: user.language,
      profile: user.clientProfile,
      memberSince: user.createdAt,
    },
    includeNotes: entry.includeNotes,
    expiresAt: entry.expiresAt,
    stats,
    logs,
    scores,
    latestHooper,
    latestRestq,
  });
}

// DELETE /api/share  (revokes all codes for current user)
export async function revokeShareCodes(req, res) {
  const result = await ShareCode.deleteMany({ userId: req.user._id });
  res.json({ deletedCount: result.deletedCount });
}
