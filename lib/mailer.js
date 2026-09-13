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

module.exports = { sendVerificationEmail };
