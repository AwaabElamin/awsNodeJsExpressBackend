import crypto from "node:crypto";
import { getFrontendBaseUrl, getMailTransporter } from "./mailer.js";

export const RESEND_COOLDOWN_MS = 60 * 1000;
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function createVerificationToken() {
  const token = crypto.randomBytes(32).toString("hex");
  return {
    token,
    hash: hashToken(token),
    expires: new Date(Date.now() + TOKEN_TTL_MS),
  };
}

export async function sendVerificationEmail({ email, firstName, token }) {
  const transporter = getMailTransporter();
  const smtpUser = process.env.BUILDSUDAN_SMTP_USER;
  if (!transporter || !email) return false;

  const baseUrl = getFrontendBaseUrl();
  const link = `${baseUrl}/?verify=${token}`;

  try {
    await transporter.sendMail({
      from: `"Build Sudan" <${smtpUser}>`,
      to: email,
      subject: "Verify your email address",
      text: [
        `Hello ${firstName || ""},`.trim(),
        "Please verify your email address to activate your account:",
        link,
        "This link expires in 24 hours. If you did not create an account, ignore this email.",
      ].join("\n\n"),
    });
    return true;
  } catch (error) {
    console.error("Failed to send verification email", error);
    return false;
  }
}
