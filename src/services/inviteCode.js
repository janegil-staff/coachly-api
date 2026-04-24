import { customAlphabet } from "nanoid";
import CoachingRelationship from "../models/CoachingRelationship.js";

// Skip ambiguous characters (0/O, 1/I/L) to make codes readable/typeable
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const generate = customAlphabet(ALPHABET, 6);

// Generate a unique 6-char code; retries on collision (extremely rare).
export async function generateUniqueInviteCode(maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    const code = generate();
    const existing = await CoachingRelationship.findOne({ inviteCode: code });
    if (!existing) return code;
  }
  throw new Error("Could not generate a unique invite code");
}

// Default invite validity: 14 days
export function defaultInviteExpiry() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d;
}
