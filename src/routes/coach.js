import express from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";
import * as ctrl from "../controllers/coachController.js";

const router = express.Router();

router.get("/dashboard",        requireAuth, requireRole("coach"), asyncHandler(ctrl.dashboard));
router.get("/clients/:id/stats", requireAuth, requireRole("coach"), asyncHandler(ctrl.clientStats));

export default router;
