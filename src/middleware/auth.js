import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { config } from "../config/env.js";
import User from "../models/User.js";
import { UnauthorizedError } from "../utils/errors.js";

// ── Token helpers ──────────────────────────────────────────────────────────
export function signAccessToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role, email: user.email },
    config.jwt.secret,
    { expiresIn: config.jwt.accessExpires },
  );
}

export function signRefreshToken(user) {
  return jwt.sign({ sub: user._id.toString() }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpires,
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.secret);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, config.jwt.refreshSecret);
}

export async function hashRefreshToken(token) {
  return bcrypt.hash(token, 8);
}

export async function compareRefreshToken(token, hash) {
  if (!hash) return false;
  return bcrypt.compare(token, hash);
}

// ── Middleware ─────────────────────────────────────────────────────────────
// Attaches req.user (full User doc) if a valid access token is present.
export async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) {
      throw new UnauthorizedError("Missing or malformed Authorization header");
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw new UnauthorizedError("Invalid or expired access token");
    }

    const user = await User.findById(payload.sub);
    if (!user) throw new UnauthorizedError("User not found");

    req.user = user;
    req.tokenPayload = payload;
    next();
  } catch (err) {
    next(err);
  }
}
