import express from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import * as ctrl from "../controllers/scoreController.js";

const router = express.Router();

router.get("/", requireAuth, asyncHandler(ctrl.listScores));

export default router;
