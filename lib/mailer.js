const nodemailer = require('nodemailer');

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error('Email delivery is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS.');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass }
  });
}

async function sendVerificationEmail({ email, firstName, verificationUrl }) {
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;

  await transporter.sendMail({
    from,
    to: email,
    subject: 'Confirm your Awaaab LLC email address',
    text: `Hello ${firstName},\n\nConfirm your email address by opening this link:\n${verificationUrl}\n\nThis link expires in ${process.env.EMAIL_VERIFICATION_TTL_MINUTES || 30} minutes.`,
    html: `<p>Hello ${firstName},</p><p>Confirm your email address to finish creating your Awaaab LLC account:</p><p><a href="${verificationUrl}">Confirm my email address</a></p><p>This link expires in ${process.env.EMAIL_VERIFICATION_TTL_MINUTES || 30} minutes.</p>`
  });
}

async function sendPasswordResetEmail({ email, firstName, resetUrl }) {
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;
  const safeFirstName = String(firstName || 'there').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[character]));
  const ttlMinutes = Number(process.env.PASSWORD_RESET_TTL_MINUTES || 30);

  await transporter.sendMail({
    from,
    to: email,
    subject: 'Reset your Awaaab LLC password',
    text: `Hello ${firstName || 'there'},\n\nWe received a request to reset your Awaaab LLC password. Use this one-time link to choose a new password:\n${resetUrl}\n\nThis link expires in ${ttlMinutes} minutes. If you did not request this, you can ignore this email.`,
    html: `<p>Hello ${safeFirstName},</p><p>We received a request to reset your Awaaab LLC password.</p><p><a href="${resetUrl}">Reset my password</a></p><p>This one-time link expires in ${ttlMinutes} minutes. If you did not request this, you can ignore this email.</p>`
  });
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
