import express from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import * as ctrl from "../controllers/logController.js";

const router = express.Router();

router.post("/", requireAuth, asyncHandler(ctrl.upsertLog));
router.get("/", requireAuth, asyncHandler(ctrl.listLogs));
router.get("/:date", requireAuth, asyncHandler(ctrl.getLogByDate));
router.delete("/:date", requireAuth, asyncHandler(ctrl.deleteLog));

export default router;
