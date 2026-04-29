// src/controllers/workoutController.js
import Workout from "../models/Workout.js";
import CoachingRelationship from "../models/CoachingRelationship.js";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../utils/errors.js";
import { isValidDateString, todayDateString } from "../utils/validation.js";

// ── Helpers ─────────────────────────────────────────────────────────────

/**
 * Resolve which client's workouts the request is about.
 * Mirrors logController.resolveClientId.
 *   - Client: own workouts
 *   - Coach: must pass clientId + have active relationship
 */
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

// ── Handlers ────────────────────────────────────────────────────────────

/**
 * GET /api/workouts/upcoming
 * Returns the client's assigned workouts grouped into today / upcoming / past.
 * Excludes templates.
 */
export async function listUpcoming(req, res) {
  const clientId = await resolveClientId(req);
  const today = todayDateString();

  // Pull a reasonable window: 30 days back, 60 days forward.
  const back = new Date();
  back.setDate(back.getDate() - 30);
  const forward = new Date();
  forward.setDate(forward.getDate() + 60);

  const fromStr = back.toISOString().slice(0, 10);
  const toStr = forward.toISOString().slice(0, 10);

  const workouts = await Workout.find({
    clientId,
    isTemplate: false,
    assignedDate: { $gte: fromStr, $lte: toStr },
  })
    .sort({ assignedDate: 1 })
    .lean();

  const todayWorkouts = workouts.filter((w) => w.assignedDate === today);
  const upcoming = workouts.filter((w) => w.assignedDate > today);
  const past = workouts
    .filter((w) => w.assignedDate < today)
    .sort((a, b) => b.assignedDate.localeCompare(a.assignedDate)); // newest first

  res.json({
    today: todayWorkouts,
    upcoming,
    past,
  });
}

/**
 * GET /api/workouts/:id
 * Single workout by id. Client must own it; coach must have relationship.
 */
export async function getWorkout(req, res) {
  const { id } = req.params;
  const workout = await Workout.findById(id).lean();
  if (!workout) throw new NotFoundError("Workout not found");

  if (req.user.role === "client") {
    if (String(workout.clientId) !== String(req.user._id)) {
      throw new ForbiddenError("Not your workout");
    }
  } else {
    // Coach — verify relationship
    const rel = await CoachingRelationship.findOne({
      coachId: req.user._id,
      clientId: workout.clientId,
      status: { $in: ["active", "paused"] },
    });
    if (!rel) throw new ForbiddenError("No active relationship");
  }

  res.json({ workout });
}

/**
 * POST /api/workouts/:id/complete
 * Body: { rpe?: 1–10, feedback?: string }
 * Marks the workout as completed by the client.
 */
export async function completeWorkout(req, res) {
  if (req.user.role !== "client") {
    throw new ForbiddenError("Only clients can complete workouts");
  }

  const { id } = req.params;
  const { rpe, feedback } = req.body || {};

  if (rpe != null) {
    if (typeof rpe !== "number" || rpe < 1 || rpe > 10) {
      throw new BadRequestError("rpe must be a number between 1 and 10");
    }
  }
  if (feedback != null && typeof feedback !== "string") {
    throw new BadRequestError("feedback must be a string");
  }

  const workout = await Workout.findById(id);
  if (!workout) throw new NotFoundError("Workout not found");
  if (String(workout.clientId) !== String(req.user._id)) {
    throw new ForbiddenError("Not your workout");
  }
  if (workout.isTemplate) {
    throw new BadRequestError("Cannot complete a template");
  }

  workout.completed = true;
  workout.completedAt = new Date();
  if (rpe != null) workout.clientRpe = rpe;
  if (feedback != null) workout.clientFeedback = feedback;

  await workout.save();
  res.json({ workout: workout.toObject() });
}

/**
 * POST /api/workouts/:id/uncomplete
 * Reverts a completion (in case of misclick).
 */
export async function uncompleteWorkout(req, res) {
  if (req.user.role !== "client") {
    throw new ForbiddenError("Only clients can uncomplete workouts");
  }

  const { id } = req.params;
  const workout = await Workout.findById(id);
  if (!workout) throw new NotFoundError("Workout not found");
  if (String(workout.clientId) !== String(req.user._id)) {
    throw new ForbiddenError("Not your workout");
  }

  workout.completed = false;
  workout.completedAt = null;
  await workout.save();

  res.json({ workout: workout.toObject() });
}