import express from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";
import * as ctrl from "../controllers/inviteController.js";

const router = express.Router();

router.post("/create", requireAuth, requireRole("coach"),  asyncHandler(ctrl.createInvite));
router.post("/redeem", requireAuth, requireRole("client"), asyncHandler(ctrl.redeemInvite));
router.get( "/:code",                                       asyncHandler(ctrl.previewInvite));

export default router;
