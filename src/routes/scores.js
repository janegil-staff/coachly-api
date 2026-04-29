// src/routes/scores.js
import express from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import * as ctrl from "../controllers/scoreController.js";

const router = express.Router();

// GET /api/scores?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/", requireAuth, asyncHandler(ctrl.getScores));

// GET /api/scores/today
router.get("/today", requireAuth, asyncHandler(ctrl.getTodayScore));

export default router;