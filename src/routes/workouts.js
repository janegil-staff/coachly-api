// src/routes/workouts.js
import express from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import * as ctrl from "../controllers/workoutController.js";

const router = express.Router();

// GET /api/workouts/upcoming  → { today, upcoming, past }
router.get("/upcoming", requireAuth, asyncHandler(ctrl.listUpcoming));

// GET /api/workouts/:id
router.get("/:id", requireAuth, asyncHandler(ctrl.getWorkout));

// POST /api/workouts/:id/complete   body: { rpe?, feedback? }
router.post("/:id/complete", requireAuth, asyncHandler(ctrl.completeWorkout));

// POST /api/workouts/:id/uncomplete
router.post(
  "/:id/uncomplete",
  requireAuth,
  asyncHandler(ctrl.uncompleteWorkout),
);

export default router;