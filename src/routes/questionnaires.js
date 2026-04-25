// src/routes/questionnaires.js
import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import * as ctrl from "../controllers/questionnaireController.js";

const router = express.Router();
router.post("/",        requireAuth, asyncHandler(ctrl.submitQuestionnaire));
router.get("/",         requireAuth, asyncHandler(ctrl.listQuestionnaires));
router.get("/latest",   requireAuth, asyncHandler(ctrl.latestQuestionnaire));
export default router;
