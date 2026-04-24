import User from "../models/User.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashRefreshToken,
  compareRefreshToken,
} from "../middleware/auth.js";
import {
  BadRequestError,
  ConflictError,
  UnauthorizedError,
} from "../utils/errors.js";
import { isValidEmail, normalizeEmail } from "../utils/validation.js";

export async function checkEmail(req, res) {
  const email = normalizeEmail(req.body?.email);
  if (!isValidEmail(email)) throw new BadRequestError("Invalid email");
  const exists = await User.exists({ email });
  res.json({ exists: !!exists });
}

export async function signup(req, res) {
  const {
    email: rawEmail,
    password,
    role,
    name,
    language,
    age,
    gender,
    heightCm,
    weightKg,
  } = req.body || {};
  const email = normalizeEmail(rawEmail);

  if (!isValidEmail(email)) throw new BadRequestError("Invalid email");
  if (typeof password !== "string" || password.length < 4) {
    throw new BadRequestError("Password must be at least 4 characters");
  }
  if (!["coach", "client"].includes(role)) {
    throw new BadRequestError("role must be 'coach' or 'client'");
  }

  const existing = await User.findOne({ email });
  if (existing) throw new ConflictError("Email is already in use");

  const passwordHash = await User.hashPassword(password);
  const clientProfile =
    role === "client"
      ? {
          ...(age != null ? { age: Number(age) } : {}),
          ...(gender ? { gender } : {}),
          ...(heightCm != null ? { heightCm: Number(heightCm) } : {}),
          ...(weightKg != null ? { weightKg: Number(weightKg) } : {}),
        }
      : undefined;

  const user = await User.create({
    email,
    passwordHash,
    role,
    name: name || "",
    language: language || "en",
    ...(clientProfile ? { clientProfile } : {}),
  });

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  user.refreshTokenHash = await hashRefreshToken(refreshToken);
  await user.save();

  res.status(201).json({
    user: user.toPublic(),
    accessToken,
    refreshToken,
  });
}

export async function login(req, res) {
  const email = normalizeEmail(req.body?.email);
  const { password } = req.body || {};

  if (!isValidEmail(email) || typeof password !== "string") {
    throw new BadRequestError("Email and password are required");
  }

  const user = await User.findOne({ email });
  if (!user) throw new UnauthorizedError("Invalid email or password");

  const ok = await user.verifyPassword(password);
  if (!ok) throw new UnauthorizedError("Invalid email or password");

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  user.refreshTokenHash = await hashRefreshToken(refreshToken);
  user.lastSeenAt = new Date();
  await user.save();

  res.json({
    user: user.toPublic(),
    accessToken,
    refreshToken,
  });
}

export async function refresh(req, res) {
  const { refreshToken } = req.body || {};
  if (typeof refreshToken !== "string") {
    throw new BadRequestError("refreshToken is required");
  }

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new UnauthorizedError("Invalid or expired refresh token");
  }

  const user = await User.findById(payload.sub);
  if (!user) throw new UnauthorizedError("User not found");

  const matches = await compareRefreshToken(
    refreshToken,
    user.refreshTokenHash,
  );
  if (!matches) {
    throw new UnauthorizedError("Refresh token is no longer valid");
  }

  const newAccess = signAccessToken(user);
  const newRefresh = signRefreshToken(user);
  user.refreshTokenHash = await hashRefreshToken(newRefresh);
  await user.save();

  res.json({
    accessToken: newAccess,
    refreshToken: newRefresh,
  });
}

export async function logout(req, res) {
  req.user.refreshTokenHash = null;
  await req.user.save();
  res.json({ ok: true });
}

export async function getMe(req, res) {
  req.user.lastSeenAt = new Date();
  await req.user.save();
  res.json({ user: req.user.toPublic() });
}

export async function deleteMe(req, res) {
  await req.user.deleteOne();
  res.json({ ok: true });
}

export async function updateMe(req, res) {
  if (req.user.role !== "client") {
    throw new BadRequestError("Only clients have a body profile");
  }

  const { gender, age, heightCm, weightKg, language, viewedAdvice, relevantAdvice } = req.body || {};

  // Validate clientProfile fields
  const profileUpdates = {};
  if (gender !== undefined) {
    if (!["female", "male", "undefined", null].includes(gender)) {
      throw new BadRequestError("gender must be 'female', 'male', 'undefined', or null");
    }
    profileUpdates.gender = gender;
  }
  if (age !== undefined) {
    if (age !== null) {
      const num = Number(age);
      if (!Number.isFinite(num) || num < 0 || num > 120) {
        throw new BadRequestError("age must be a number between 0 and 120");
      }
      profileUpdates.age = num;
    } else profileUpdates.age = null;
  }
  if (heightCm !== undefined) {
    if (heightCm !== null) {
      const num = Number(heightCm);
      if (!Number.isFinite(num) || num <= 0 || num > 300) {
        throw new BadRequestError("heightCm must be a number between 0 and 300");
      }
      profileUpdates.heightCm = num;
    } else profileUpdates.heightCm = null;
  }
  if (viewedAdvice !== undefined) {
    if (!Array.isArray(viewedAdvice) || viewedAdvice.some((id) => typeof id !== "string")) {
      throw new BadRequestError("viewedAdvice must be an array of strings");
    }
    profileUpdates.viewedAdvice = viewedAdvice;
  }
  if (relevantAdvice !== undefined) {
    if (!Array.isArray(relevantAdvice) || relevantAdvice.some((id) => typeof id !== "string")) {
      throw new BadRequestError("relevantAdvice must be an array of strings");
    }
    profileUpdates.relevantAdvice = relevantAdvice;
  }
  if (weightKg !== undefined) {
    if (weightKg !== null) {
      const num = Number(weightKg);
      if (!Number.isFinite(num) || num <= 0 || num > 500) {
        throw new BadRequestError("weightKg must be a number between 0 and 500");
      }
      profileUpdates.weightKg = num;
    } else profileUpdates.weightKg = null;
  }

  // Validate language (lives at user root, not on clientProfile)
  const SUPPORTED = ["no", "en", "nl", "fr", "de", "it", "sv", "da", "fi", "es", "pl", "pt"];
  let languageUpdate = undefined;
  if (language !== undefined) {
    if (typeof language !== "string" || !SUPPORTED.includes(language)) {
      throw new BadRequestError("Unsupported language code");
    }
    languageUpdate = language;
  }

  if (Object.keys(profileUpdates).length === 0 && languageUpdate === undefined) {
    throw new BadRequestError("No valid profile fields provided");
  }

  const user = await User.findById(req.user._id);
  if (!user) throw new UnauthorizedError("User not found");

  if (Object.keys(profileUpdates).length > 0) {
    user.clientProfile = {
      ...(user.clientProfile?.toObject?.() ?? user.clientProfile ?? {}),
      ...profileUpdates,
    };
  }
  if (languageUpdate !== undefined) {
    user.language = languageUpdate;
  }
  await user.save();

  res.json({ user: user.toPublic() });
}

export async function changeEmail(req, res) {
  const { newEmail: rawEmail, password } = req.body || {};
  const newEmail = normalizeEmail(rawEmail);

  if (!isValidEmail(newEmail)) throw new BadRequestError("Invalid email");
  if (typeof password !== "string" || password.length < 4) {
    throw new BadRequestError("Password is required");
  }

  const user = await User.findById(req.user._id);
  if (!user) throw new UnauthorizedError("User not found");

  const ok = await user.verifyPassword(password);
  if (!ok) throw new UnauthorizedError("Incorrect password");

  if (newEmail === user.email) {
    throw new BadRequestError("New email must differ from current");
  }

  const existing = await User.findOne({ email: newEmail });
  if (existing) throw new ConflictError("Email is already in use");

  user.email = newEmail;
  await user.save();

  res.json({ user: user.toPublic() });
}

export async function changePassword(req, res) {
  const { oldPassword, newPassword } = req.body || {};

  if (typeof oldPassword !== "string" || typeof newPassword !== "string") {
    throw new BadRequestError("oldPassword and newPassword are required");
  }
  if (newPassword.length < 4) {
    throw new BadRequestError("New password must be at least 4 characters");
  }
  if (oldPassword === newPassword) {
    throw new BadRequestError("New password must differ from current");
  }

  const user = await User.findById(req.user._id);
  if (!user) throw new UnauthorizedError("User not found");

  const ok = await user.verifyPassword(oldPassword);
  if (!ok) throw new UnauthorizedError("Incorrect password");

  user.passwordHash = await User.hashPassword(newPassword);

  // Rotate refresh token so old sessions can no longer refresh.
  const refreshToken = signRefreshToken(user);
  user.refreshTokenHash = await hashRefreshToken(refreshToken);
  await user.save();

  const accessToken = signAccessToken(user);
  res.json({ user: user.toPublic(), accessToken, refreshToken });
}
