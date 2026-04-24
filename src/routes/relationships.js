import express from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import * as ctrl from "../controllers/relationshipController.js";

const router = express.Router();

router.get(  "/",    requireAuth, asyncHandler(ctrl.listRelationships));
router.get(  "/:id", requireAuth, asyncHandler(ctrl.getRelationship));
router.patch("/:id", requireAuth, asyncHandler(ctrl.updateRelationship));

export default router;
