import LogEntry from "../models/LogEntry.js";
import DailyScore from "../models/DailyScore.js";
import CoachingRelationship from "../models/CoachingRelationship.js";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../utils/errors.js";
import { isValidDateString, todayDateString } from "../utils/validation.js";
import { scoreEntry } from "../services/scoreCalculator.js";
import { computeStreak } from "../services/streak.js";

// ── Helpers ────────────────────────────────────────────────────────────────

// Resolve which client's logs the request is about, and enforce access.
// - Client: always their own logs
// - Coach: must pass clientId (query/body/params) + have active relationship
async function resolveClientId(req) {
  if (req.user.role === "client") return req.user._id;

  const clientId =
    req.query.clientId || req.body?.clientId || req.params?.clientId;
  if (!clientId) {
    throw new BadRequestError("clientId is required for coach access");
  }

  const rel = await CoachingRelationship.findOne({
    coachId: req.user._id,
    clientId,
    status: { $in: ["active", "paused"] },
  });
  if (!rel) throw new ForbiddenError("No active relationship with this client");
  return clientId;
}

// Recompute + upsert DailyScore for a log entry
async function upsertScore(clientId, entry) {
  const scores = scoreEntry(entry);
  const streakDay = await computeStreak(clientId, entry.date);
  await DailyScore.findOneAndUpdate(
    { clientId, date: entry.date },
    { $set: { clientId, date: entry.date, ...scores, streakDay } },
    { upsert: true, new: true },
  );
  return { ...scores, streakDay };
}

// ── Handlers ───────────────────────────────────────────────────────────────

export async function upsertLog(req, res) {
  if (req.user.role !== "client") {
    throw new ForbiddenError("Only clients can write log entries");
  }

  const { date = todayDateString(), ...fields } = req.body || {};
  if (!isValidDateString(date)) {
    throw new BadRequestError("date must be YYYY-MM-DD");
  }
  if (date > todayDateString()) {
    throw new BadRequestError("Cannot log future dates");
  }

  const entry = await LogEntry.findOneAndUpdate(
    { clientId: req.user._id, date },
    { $set: { ...fields, clientId: req.user._id, date } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const score = await upsertScore(req.user._id, entry);
  res.status(201).json({ entry, score });
}

export async function listLogs(req, res) {
  const clientId = await resolveClientId(req);
  const { from, to, limit } = req.query;

  const filter = { clientId };
  if (from || to) {
    filter.date = {};
    if (from) {
      if (!isValidDateString(from)) throw new BadRequestError("Invalid 'from'");
      filter.date.$gte = from;
    }
    if (to) {
      if (!isValidDateString(to)) throw new BadRequestError("Invalid 'to'");
      filter.date.$lte = to;
    }
  }

  const logs = await LogEntry.find(filter)
    .sort({ date: -1 })
    .limit(Math.min(parseInt(limit || "500", 10), 1000));

  res.json({ logs });
}

export async function getLogByDate(req, res) {
  const clientId = await resolveClientId(req);
  const { date } = req.params;
  if (!isValidDateString(date)) {
    throw new BadRequestError("date must be YYYY-MM-DD");
  }
  const entry = await LogEntry.findOne({ clientId, date });
  if (!entry) throw new NotFoundError("No log for that date");
  res.json({ entry });
}

export async function deleteLog(req, res) {
  if (req.user.role !== "client") {
    throw new ForbiddenError("Only clients can delete log entries");
  }
  const { date } = req.params;
  if (!isValidDateString(date)) {
    throw new BadRequestError("date must be YYYY-MM-DD");
  }
  const result = await LogEntry.findOneAndDelete({
    clientId: req.user._id,
    date,
  });
  if (!result) throw new NotFoundError("No log for that date");
  await DailyScore.findOneAndDelete({ clientId: req.user._id, date });
  res.json({ ok: true });
}
