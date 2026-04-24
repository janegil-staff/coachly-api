import express from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import * as ctrl from "../controllers/messageController.js";

const router = express.Router();

router.post( "/",     requireAuth, asyncHandler(ctrl.createMessage));
router.get(  "/",     requireAuth, asyncHandler(ctrl.listMessages));
router.patch("/read", requireAuth, asyncHandler(ctrl.markMessagesRead));

export default router;
