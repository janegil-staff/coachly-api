import express from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";
import * as ctrl from "../controllers/workoutController.js";

const router = express.Router();

router.post(  "/",              requireAuth, requireRole("coach"),  asyncHandler(ctrl.createWorkout));
router.get(   "/",              requireAuth,                         asyncHandler(ctrl.listWorkouts));
router.get(   "/:id",           requireAuth,                         asyncHandler(ctrl.getWorkout));
router.patch( "/:id/complete",  requireAuth, requireRole("client"), asyncHandler(ctrl.completeWorkout));
router.delete("/:id",           requireAuth, requireRole("coach"),  asyncHandler(ctrl.deleteWorkout));

export default router;
