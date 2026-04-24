import DailyScore from "../models/DailyScore.js";
import CoachingRelationship from "../models/CoachingRelationship.js";
import { BadRequestError, ForbiddenError } from "../utils/errors.js";

export async function listScores(req, res) {
  let clientId;
  if (req.user.role === "client") {
    clientId = req.user._id;
  } else {
    clientId = req.query.clientId;
    if (!clientId) throw new BadRequestError("clientId is required");
    const rel = await CoachingRelationship.findOne({
      coachId: req.user._id,
      clientId,
      status: { $in: ["active", "paused"] },
    });
    if (!rel) throw new ForbiddenError("No access to this client");
  }

  const { from, to } = req.query;
  const filter = { clientId };
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = from;
    if (to) filter.date.$lte = to;
  }

  const scores = await DailyScore.find(filter).sort({ date: 1 });
  res.json({ scores });
}
