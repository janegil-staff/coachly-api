import Message from "../models/Message.js";
import CoachingRelationship from "../models/CoachingRelationship.js";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../utils/errors.js";

export async function createMessage(req, res) {
  const { relationshipId, text } = req.body || {};
  if (!relationshipId || !text || !text.trim()) {
    throw new BadRequestError("relationshipId and text are required");
  }

  const rel = await CoachingRelationship.findById(relationshipId);
  if (!rel) throw new NotFoundError("Relationship not found");

  const isParticipant =
    rel.coachId?.equals(req.user._id) || rel.clientId?.equals(req.user._id);
  if (!isParticipant) throw new ForbiddenError();
  if (rel.status !== "active") {
    throw new ForbiddenError("Cannot message in an inactive relationship");
  }

  const msg = await Message.create({
    relationshipId,
    senderId: req.user._id,
    text: text.trim(),
  });
  res.status(201).json({ message: msg });
}

export async function listMessages(req, res) {
  const { relationshipId, before, limit } = req.query;
  if (!relationshipId) throw new BadRequestError("relationshipId is required");

  const rel = await CoachingRelationship.findById(relationshipId);
  if (!rel) throw new NotFoundError();
  const isParticipant =
    rel.coachId?.equals(req.user._id) || rel.clientId?.equals(req.user._id);
  if (!isParticipant) throw new ForbiddenError();

  const filter = { relationshipId };
  if (before) filter.createdAt = { $lt: new Date(before) };

  const messages = await Message.find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.min(parseInt(limit || "50", 10), 200));

  res.json({ messages: messages.reverse() });
}

export async function markMessagesRead(req, res) {
  const { relationshipId } = req.body || {};
  if (!relationshipId) throw new BadRequestError("relationshipId is required");

  const rel = await CoachingRelationship.findById(relationshipId);
  if (!rel) throw new NotFoundError();
  const isParticipant =
    rel.coachId?.equals(req.user._id) || rel.clientId?.equals(req.user._id);
  if (!isParticipant) throw new ForbiddenError();

  await Message.updateMany(
    {
      relationshipId,
      senderId: { $ne: req.user._id },
      readAt: null,
    },
    { $set: { readAt: new Date() } },
  );

  res.json({ ok: true });
}
