// src/routes/auth.js

import express from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import * as ctrl from "../controllers/authController.js";

const router = express.Router();

router.post("/check-email", asyncHandler(ctrl.checkEmail));
router.post("/signup", asyncHandler(ctrl.signup));
router.post("/login", asyncHandler(ctrl.login));
router.post("/refresh", asyncHandler(ctrl.refresh));

// ── Password reset (no auth required — user is locked out by definition) ──
router.post("/forgot-password", asyncHandler(ctrl.forgotPassword));
router.post("/reset-password", asyncHandler(ctrl.resetPassword));

router.post("/logout", requireAuth, asyncHandler(ctrl.logout));
router.get("/me", requireAuth, asyncHandler(ctrl.getMe));
router.patch("/me", requireAuth, asyncHandler(ctrl.updateMe));
router.patch("/change-email", requireAuth, asyncHandler(ctrl.changeEmail));
router.patch(
  "/change-password",
  requireAuth,
  asyncHandler(ctrl.changePassword),
);
router.delete("/me", requireAuth, asyncHandler(ctrl.deleteMe));

export default router;
