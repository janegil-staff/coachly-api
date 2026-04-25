// src/routes/share.js
import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import * as ctrl from "../controllers/shareController.js";

const router = express.Router();

router.post("/", requireAuth, asyncHandler(ctrl.createShareCode));
router.delete("/", requireAuth, asyncHandler(ctrl.revokeShareCodes));
router.get("/:code", asyncHandler(ctrl.fetchShareReport));

export default router;
