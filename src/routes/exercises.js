// src/routes/exercises.js
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  listCustom,
  createCustom,
  updateCustom,
  deleteCustom,
  getSelection,
  setSelection,
  toggleSelection,
} from "../controllers/exerciseController.js";

const router = Router();

router.use(requireAuth);

// Custom exercise CRUD
router.get("/custom", listCustom);
router.post("/custom", createCustom);
router.patch("/custom/:id", updateCustom);
router.delete("/custom/:id", deleteCustom);

// Catalog selection
router.get("/selection", getSelection);
router.put("/selection", setSelection);
router.post("/selection/toggle", toggleSelection);

export default router;