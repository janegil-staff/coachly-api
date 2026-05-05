import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import asyncHandler from "../utils/asyncHandler.js";
import { deleteAccount } from "../controllers/userController.js";

const router = express.Router();

router.delete("/me", requireAuth, asyncHandler(deleteAccount));

export default router;