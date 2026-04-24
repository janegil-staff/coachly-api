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
  const { email: rawEmail, password, role, name, language } = req.body || {};
  const email = normalizeEmail(rawEmail);

  if (!isValidEmail(email)) throw new BadRequestError("Invalid email");
  if (typeof password !== "string" || password.length < 8) {
    throw new BadRequestError("Password must be at least 8 characters");
  }
  if (!["coach", "client"].includes(role)) {
    throw new BadRequestError("role must be 'coach' or 'client'");
  }

  const existing = await User.findOne({ email });
  if (existing) throw new ConflictError("Email is already in use");

  const passwordHash = await User.hashPassword(password);
  const user = await User.create({
    email,
    passwordHash,
    role,
    name: name || "",
    language: language || "en",
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
