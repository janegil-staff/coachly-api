import User from "../models/User.js";
import Session from "../models/Session.js";
import QuestionnaireResponse from "../models/QuestionnaireResponse.js";
import ShareCode from "../models/ShareCode.js";
import bcrypt from "bcryptjs";

export const deleteAccount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { pin } = req.body;

    if (!pin) {
      return res.status(400).json({ error: "PIN required" });
    }

    const user = await User.findById(userId).select("+pin");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const pinValid = await bcrypt.compare(pin, user.pin);
    if (!pinValid) {
      return res.status(401).json({ error: "Invalid PIN" });
    }

    await Promise.all([
      Session.deleteMany({ userId }),
      QuestionnaireResponse.deleteMany({ userId }),
      ShareCode.deleteMany({ userId }),
    ]);

    await User.findByIdAndDelete(userId);

    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
