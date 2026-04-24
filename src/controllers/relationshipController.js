import CoachingRelationship from "../models/CoachingRelationship.js";
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from "../utils/errors.js";

export async function listRelationships(req, res) {
  const filter =
    req.user.role === "coach"
      ? { coachId: req.user._id }
      : { clientId: req.user._id };

  const { status } = req.query;
  if (status) filter.status = status;

  const rels = await CoachingRelationship.find(filter)
    .sort({ createdAt: -1 })
    .populate("coachId", "name email avatar coachProfile")
    .populate("clientId", "name email avatar clientProfile");

  res.json({ relationships: rels });
}

export async function getRelationship(req, res) {
  const rel = await CoachingRelationship.findById(req.params.id)
    .populate("coachId", "name email avatar coachProfile")
    .populate("clientId", "name email avatar clientProfile");

  if (!rel) throw new NotFoundError("Relationship not found");

  const isParticipant =
    rel.coachId?._id?.equals(req.user._id) ||
    rel.clientId?._id?.equals(req.user._id);
  if (!isParticipant) throw new ForbiddenError();

  res.json({ relationship: rel });
}

export async function updateRelationship(req, res) {
  const { status, coachNotes } = req.body || {};
  const rel = await CoachingRelationship.findById(req.params.id);
  if (!rel) throw new NotFoundError("Relationship not found");

  const isCoach = rel.coachId?.equals(req.user._id);
  const isClient = rel.clientId?.equals(req.user._id);
  if (!isCoach && !isClient) throw new ForbiddenError();

  if (status) {
    const allowed = ["active", "paused", "ended"];
    if (!allowed.includes(status)) {
      throw new BadRequestError(
        `status must be one of: ${allowed.join(", ")}`,
      );
    }
    rel.status = status;
    if (status === "ended") rel.endedAt = new Date();
  }

  // Only coach can edit coachNotes
  if (coachNotes != null && isCoach) {
    rel.coachNotes = coachNotes;
  }

  await rel.save();
  res.json({ relationship: rel });
}
