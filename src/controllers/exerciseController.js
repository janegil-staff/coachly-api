// src/controllers/exerciseController.js
//
// Handles:
//   - User-CUSTOM exercises (CRUD)
//   - Catalog SELECTION (toggling which hardcoded slugs the user has picked)
//
// The catalog itself (44 default exercises) is hardcoded in the frontend
// (lib/exerciseCatalog.js) so it can be translated.

import Exercise from "../models/Exercise.js";
import UserExerciseSelection from "../models/UserExerciseSelection.js";

const CATEGORIES = ["strength", "cardio", "mobility", "recovery", "other"];

// ── Helpers ─────────────────────────────────────────────────────────────────

async function getOrCreateSelection(patientId) {
  let doc = await UserExerciseSelection.findOne({ patient: patientId });
  if (!doc) {
    doc = await UserExerciseSelection.create({
      patient: patientId,
      selectedSlugs: [],
    });
  }
  return doc;
}

// ── Custom exercise CRUD ────────────────────────────────────────────────────

/**
 * GET /api/exercises/custom
 * Returns the user's custom exercises. They are implicitly always "selected".
 */
export async function listCustom(req, res, next) {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ error: "Not authenticated." });
    }

    const exercises = await Exercise.find({
      isCustom: true,
      patient: req.user._id,
    })
      .sort({ name: 1 })
      .lean();

    res.json({ exercises });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/exercises/custom
 * Body: { name, category }
 */
export async function createCustom(req, res, next) {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ error: "Not authenticated." });
    }

    const { name, category } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Name is required." });
    }
    if (!CATEGORIES.includes(category)) {
      return res.status(400).json({ error: "Invalid category." });
    }

    const exercise = await Exercise.create({
      name: name.trim(),
      category,
      isCustom: true,
      patient: req.user._id,
    });

    res.status(201).json({ exercise });
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ error: "You already have an exercise with that name." });
    }
    next(err);
  }
}

/**
 * PATCH /api/exercises/custom/:id
 * Body: { name?, category? }
 */
export async function updateCustom(req, res, next) {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ error: "Not authenticated." });
    }

    const ex = await Exercise.findOne({
      _id: req.params.id,
      isCustom: true,
      patient: req.user._id,
    });

    if (!ex) return res.status(404).json({ error: "Not found." });

    if (req.body.name != null) {
      const trimmed = String(req.body.name).trim();
      if (!trimmed) {
        return res.status(400).json({ error: "Name cannot be empty." });
      }
      ex.name = trimmed;
    }

    if (req.body.category) {
      if (!CATEGORIES.includes(req.body.category)) {
        return res.status(400).json({ error: "Invalid category." });
      }
      ex.category = req.body.category;
    }

    await ex.save();
    res.json({ exercise: ex });
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ error: "You already have an exercise with that name." });
    }
    next(err);
  }
}

/**
 * DELETE /api/exercises/custom/:id
 */
export async function deleteCustom(req, res, next) {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ error: "Not authenticated." });
    }

    const ex = await Exercise.findOneAndDelete({
      _id: req.params.id,
      isCustom: true,
      patient: req.user._id,
    });

    if (!ex) return res.status(404).json({ error: "Not found." });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// ── Catalog selection ───────────────────────────────────────────────────────

/**
 * GET /api/exercises/selection
 * Returns the user's selected catalog slugs.
 */
export async function getSelection(req, res, next) {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ error: "Not authenticated." });
    }
    const doc = await getOrCreateSelection(req.user._id);
    res.json({ selectedSlugs: doc.selectedSlugs });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/exercises/selection
 * Replaces the selection wholesale.
 * Body: { slugs: ["bench_press", "running"] }
 */
export async function setSelection(req, res, next) {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ error: "Not authenticated." });
    }
    const { slugs } = req.body;
    if (!Array.isArray(slugs)) {
      return res.status(400).json({ error: "slugs must be an array." });
    }

    // Sanitize: only allow strings, dedupe
    const clean = [
      ...new Set(slugs.filter((s) => typeof s === "string" && s.trim())),
    ];

    const doc = await UserExerciseSelection.findOneAndUpdate(
      { patient: req.user._id },
      { $set: { selectedSlugs: clean } },
      { upsert: true, new: true }
    );

    res.json({ selectedSlugs: doc.selectedSlugs });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/exercises/selection/toggle
 * Body: { slug: "bench_press" }
 * Toggles a single slug in/out of the selection.
 */
export async function toggleSelection(req, res, next) {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ error: "Not authenticated." });
    }
    const { slug } = req.body;
    if (!slug || typeof slug !== "string") {
      return res.status(400).json({ error: "slug is required." });
    }

    const doc = await getOrCreateSelection(req.user._id);
    const idx = doc.selectedSlugs.indexOf(slug);
    if (idx >= 0) {
      doc.selectedSlugs.splice(idx, 1);
    } else {
      doc.selectedSlugs.push(slug);
    }
    await doc.save();

    res.json({ selectedSlugs: doc.selectedSlugs, selected: idx < 0 });
  } catch (err) {
    next(err);
  }
}
