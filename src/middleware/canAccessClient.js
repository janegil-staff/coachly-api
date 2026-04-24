import CoachingRelationship from "../models/CoachingRelationship.js";
import { ForbiddenError, BadRequestError } from "../utils/errors.js";

// Ensures the authenticated coach has an active relationship with the given clientId.
// Reads clientId from req.query, req.body, or req.params (in that order).
// Attaches req.relationship for downstream use.
export async function canAccessClient(req, _res, next) {
  try {
    if (!req.user) return next(new ForbiddenError("Not authenticated"));

    // Clients can only access their own data — handled elsewhere; this gate is coach-focused
    if (req.user.role !== "coach") {
      return next(new ForbiddenError("Coach role required"));
    }

    const clientId =
      req.query.clientId || req.body?.clientId || req.params?.clientId;

    if (!clientId) {
      return next(new BadRequestError("clientId is required"));
    }

    const rel = await CoachingRelationship.findOne({
      coachId: req.user._id,
      clientId,
      status: { $in: ["active", "paused"] },
    });

    if (!rel) {
      return next(
        new ForbiddenError("You do not have access to this client"),
      );
    }

    req.relationship = rel;
    next();
  } catch (err) {
    next(err);
  }
}
