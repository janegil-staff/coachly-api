import express from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import * as ctrl from "../controllers/authController.js";

const router = express.Router();

router.post("/check-email", asyncHandler(ctrl.checkEmail));
router.post("/signup",      asyncHandler(ctrl.signup));
router.post("/login",       asyncHandler(ctrl.login));
router.post("/refresh",     asyncHandler(ctrl.refresh));
router.post("/logout",      requireAuth, asyncHandler(ctrl.logout));
router.get(   "/me",        requireAuth, asyncHandler(ctrl.getMe));
router.delete("/me",        requireAuth, asyncHandler(ctrl.deleteMe));

export default router;
