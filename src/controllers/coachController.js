import CoachingRelationship from "../models/CoachingRelationship.js";
import LogEntry from "../models/LogEntry.js";
import DailyScore from "../models/DailyScore.js";
import Workout from "../models/Workout.js";
import { ForbiddenError } from "../utils/errors.js";
import { todayDateString } from "../utils/validation.js";

export async function dashboard(req, res) {
  const rels = await CoachingRelationship.find({
    coachId: req.user._id,
    status: "active",
  }).populate("clientId", "name email avatar clientProfile");

  const clientIds = rels.map((r) => r.clientId?._id).filter(Boolean);

  // Latest log per client (past 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoff = sevenDaysAgo.toISOString().slice(0, 10);

  const recentLogs = await LogEntry.aggregate([
    { $match: { clientId: { $in: clientIds }, date: { $gte: cutoff } } },
    { $sort: { date: -1 } },
    {
      $group: {
        _id: "$clientId",
        latestDate: { $first: "$date" },
        latestLog: { $first: "$$ROOT" },
        count: { $sum: 1 },
      },
    },
  ]);

  const logByClient = new Map(recentLogs.map((l) => [String(l._id), l]));

  const today = todayDateString();
  const clients = rels
    .map((rel) => {
      const c = rel.clientId;
      if (!c) return null;
      const recent = logByClient.get(String(c._id));
      const loggedToday = recent?.latestDate === today;
      return {
        relationshipId: rel._id,
        client: {
          _id: c._id,
          name: c.name,
          email: c.email,
          avatar: c.avatar,
          goalType: c.clientProfile?.goalType,
        },
        latestLogDate: recent?.latestDate || null,
        logsLast7Days: recent?.count || 0,
        loggedToday,
        latestLog: recent?.latestLog || null,
      };
    })
    .filter(Boolean);

  res.json({
    coach: {
      name: req.user.name,
      isPro: req.user.coachProfile?.isPro ?? false,
      maxClients: req.user.coachProfile?.maxClients ?? 5,
      activeClients: clients.length,
    },
    clients,
  });
}

export async function clientStats(req, res) {
  const { id: clientId } = req.params;
  const { from, to } = req.query;

  const rel = await CoachingRelationship.findOne({
    coachId: req.user._id,
    clientId,
    status: { $in: ["active", "paused"] },
  });
  if (!rel) throw new ForbiddenError("No access to this client");

  const logFilter = { clientId };
  if (from || to) {
    logFilter.date = {};
    if (from) logFilter.date.$gte = from;
    if (to) logFilter.date.$lte = to;
  }

  const [logs, scores, workouts] = await Promise.all([
    LogEntry.find(logFilter).sort({ date: 1 }),
    DailyScore.find(logFilter).sort({ date: 1 }),
    Workout.find({
      clientId,
      isTemplate: false,
      ...(from || to
        ? {
            assignedDate: {
              ...(from ? { $gte: from } : {}),
              ...(to ? { $lte: to } : {}),
            },
          }
        : {}),
    }).sort({ assignedDate: 1 }),
  ]);

  const completed = workouts.filter((w) => w.completed).length;
  const adherence = workouts.length
    ? Math.round((completed / workouts.length) * 100)
    : null;

  const avgComposite = scores.length
    ? Math.round(
        scores.reduce((s, sc) => s + (sc.compositeScore || 0), 0) /
          scores.length,
      )
    : null;

  res.json({
    logs,
    scores,
    workouts,
    summary: {
      daysLogged: logs.length,
      workoutsAssigned: workouts.length,
      workoutsCompleted: completed,
      adherence,
      avgCompositeScore: avgComposite,
    },
  });
}
