// src/services/emailService.js
//
// Thin Resend wrapper. Currently exposes:
//   - sendPinResetEmail(email, code, language)
//
// Adding a new email type means: add a template function in emailTemplates.js,
// then wire it through here.

import { Resend } from "resend";
import {
  pinResetEmailHtml,
  pinResetEmailText,
  pinResetEmailSubject,
} from "./emailTemplates.js";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "Coachly <onboarding@resend.dev>";

if (!RESEND_API_KEY) {
  console.warn(
    "[emailService] RESEND_API_KEY is not set — emails will fail to send.",
  );
}

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

/**
 * Send a 6-digit PIN reset code to the user's email.
 * @param {string} email      Recipient address.
 * @param {string} code       6-digit numeric code (string, leading zeros preserved).
 * @param {string} language   ISO code from the supported list ("en", "no", ...).
 *                            Falls back to English for unknown codes.
 * @returns {Promise<{id: string}>}  Resend message id on success.
 */
export async function sendPinResetEmail(email, code, language = "en") {
  if (!resend) {
    throw new Error("Email service is not configured (RESEND_API_KEY missing)");
  }

  const lang = language || "en";
  const subject = pinResetEmailSubject(lang);
  const html = pinResetEmailHtml(code, lang);
  const text = pinResetEmailText(code, lang);

  const { data, error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: email,
    subject,
    html,
    text,
  });

  if (error) {
    // Resend returns shape: { message, name, statusCode }
    const msg = error?.message || "Failed to send email";
    const err = new Error(`[emailService] ${msg}`);
    err.cause = error;
    throw err;
  }

  return data; // { id: "..." }
}
