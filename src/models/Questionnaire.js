// src/models/Questionnaire.js
import mongoose from "mongoose";

const QuestionnaireSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["hooper", "restq"],
      required: true,
      index: true,
    },
    // Date of submission, YYYY-MM-DD
    date: { type: String, required: true, index: true },
    // Raw answers in item order. Hooper: 4 values (1-7). RESTQ: 36 values (0-6).
    answers: { type: [Number], required: true },
    // Computed scores — shape varies by type
    scores: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// One submission per user per type per day (upsert semantics)
QuestionnaireSchema.index({ userId: 1, type: 1, date: 1 }, { unique: true });

const Questionnaire = mongoose.model("Questionnaire", QuestionnaireSchema);
export default Questionnaire;
