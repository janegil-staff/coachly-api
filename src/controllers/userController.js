import User from "../models/User.js";
import LogEntry from "../models/LogEntry.js";
import Questionnaire from "../models/Questionnaire.js";
import ShareCode from "../models/ShareCode.js";
import CoachingRelationship from "../models/CoachingRelationship.js";
import Message from "../models/Message.js";
import DailyScore from "../models/DailyScore.js";
import UserExerciseSelection from "../models/UserExerciseSelection.js";
import Workout from "../models/Workout.js";
import bcrypt from "bcryptjs";

export const deleteAccount = async (req, res, next) => {
  try {
    // Coachly's auth middleware likely sets one of these — adjust if needed
    const userId = req.user?.id || req.user?._id || req.userId;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { password, pin } = req.body;
    const credential = password || pin;

    if (!credential) {
      return res.status(400).json({ error: "Password required" });
    }

    const user = await User.findById(userId).select("+password +pin");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Try password first (Coachly uses email/password auth based on your routes),
    // fall back to PIN if the user model has one.
    let valid = false;
    if (user.password) {
      valid = await bcrypt.compare(credential, user.password);
    }
    if (!valid && user.pin) {
      valid = await bcrypt.compare(credential, user.pin);
    }

    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Cascade delete everything tied to this user
    await Promise.all([
      LogEntry.deleteMany({ userId }),
      Questionnaire.deleteMany({ userId }),
      ShareCode.deleteMany({ userId }),
      DailyScore.deleteMany({ userId }),
      UserExerciseSelection.deleteMany({ userId }),
      Workout.deleteMany({ userId }),
      // Coaching relationships could reference user as either coach or client
      CoachingRelationship.deleteMany({
        $or: [{ coachId: userId }, { clientId: userId }],
      }),
      // Messages could be sender or recipient
      Message.deleteMany({
        $or: [{ from: userId }, { to: userId }],
      }),
    ]);

    await User.findByIdAndDelete(userId);

    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
};