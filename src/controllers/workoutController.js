import Workout from "../models/Workout.js";
import CoachingRelationship from "../models/CoachingRelationship.js";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../utils/errors.js";
import { isValidDateString } from "../utils/validation.js";

export async function createWorkout(req, res) {
  const { clientId, title, assignedDate, exercises, isTemplate, templateName } =
    req.body || {};

  if (!isTemplate) {
    if (!clientId) throw new BadRequestError("clientId is required");
    if (!isValidDateString(assignedDate)) {
      throw new BadRequestError("assignedDate must be YYYY-MM-DD");
    }
    const rel = await CoachingRelationship.findOne({
      coachId: req.user._id,
      clientId,
      status: { $in: ["active", "paused"] },
    });
    if (!rel) throw new ForbiddenError("No active relationship with this client");
  }

  if (!title || typeof title !== "string") {
    throw new BadRequestError("title is required");
  }

  const workout = await Workout.create({
    coachId: req.user._id,
    clientId: isTemplate ? req.user._id : clientId, // templates owned by coach
    title,
    assignedDate: isTemplate ? "1970-01-01" : assignedDate,
    exercises: Array.isArray(exercises) ? exercises : [],
    isTemplate: !!isTemplate,
    templateName: templateName || "",
  });

  res.status(201).json({ workout });
}

export async function listWorkouts(req, res) {
  const { clientId, from, to, templates } = req.query;

  const filter = {};
  if (req.user.role === "coach") {
    filter.coachId = req.user._id;
    if (templates === "true") {
      filter.isTemplate = true;
    } else {
      filter.isTemplate = false;
      if (clientId) filter.clientId = clientId;
    }
  } else {
    filter.clientId = req.user._id;
    filter.isTemplate = false;
  }

  if (from || to) {
    filter.assignedDate = {};
    if (from) filter.assignedDate.$gte = from;
    if (to) filter.assignedDate.$lte = to;
  }

  const workouts = await Workout.find(filter)
    .sort({ assignedDate: -1, createdAt: -1 })
    .limit(500);

  res.json({ workouts });
}

export async function getWorkout(req, res) {
  const w = await Workout.findById(req.params.id);
  if (!w) throw new NotFoundError("Workout not found");

  const isParticipant =
    w.coachId.equals(req.user._id) || w.clientId.equals(req.user._id);
  if (!isParticipant) throw new ForbiddenError();

  res.json({ workout: w });
}

export async function completeWorkout(req, res) {
  const { clientFeedback, clientRpe } = req.body || {};
  const w = await Workout.findById(req.params.id);
  if (!w) throw new NotFoundError("Workout not found");
  if (!w.clientId.equals(req.user._id)) throw new ForbiddenError();

  w.completed = true;
  w.completedAt = new Date();
  if (clientFeedback != null) w.clientFeedback = clientFeedback;
  if (clientRpe != null) w.clientRpe = clientRpe;
  await w.save();

  res.json({ workout: w });
}

export async function deleteWorkout(req, res) {
  const w = await Workout.findById(req.params.id);
  if (!w) throw new NotFoundError();
  if (!w.coachId.equals(req.user._id)) throw new ForbiddenError();
  await w.deleteOne();
  res.json({ ok: true });
}
