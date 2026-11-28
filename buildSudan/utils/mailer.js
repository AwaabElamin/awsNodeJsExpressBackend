import nodemailer from "nodemailer";

let cachedTransporter = null;

export function getFrontendBaseUrl() {
  return (process.env.BUILDSUDAN_FRONTEND_URL || "")
    .split(",").map(value => value.trim()).find(Boolean)?.replace(/\/+$/, "") || "";
}

export function getMailTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const smtpUser = process.env.BUILDSUDAN_SMTP_USER;
  if (!smtpUser) return null;

  const clientId = process.env.BUILDSUDAN_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.BUILDSUDAN_GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.BUILDSUDAN_GOOGLE_REFRESH_TOKEN;

  if (clientId && clientSecret && refreshToken) {
    cachedTransporter = nodemailer.createTransport({
      host: process.env.BUILDSUDAN_SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.BUILDSUDAN_SMTP_PORT || 465),
      secure: String(process.env.BUILDSUDAN_SMTP_SECURE || "true") === "true",
      auth: {
        type: "OAuth2",
        user: smtpUser,
        clientId,
        clientSecret,
        refreshToken,
      },
    });
    return cachedTransporter;
  }

  const smtpPass = process.env.BUILDSUDAN_SMTP_PASS;
  if (!smtpPass) return null;

  cachedTransporter = nodemailer.createTransport({
    host: process.env.BUILDSUDAN_SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.BUILDSUDAN_SMTP_PORT || 465),
    secure: String(process.env.BUILDSUDAN_SMTP_SECURE || "true") === "true",
    auth: { user: smtpUser, pass: smtpPass },
  });
  return cachedTransporter;
}

export async function sendAssessmentAdminNotice({
  application,
  assessment,
  hazardAlert,
}) {
  const transporter = getMailTransporter();
  const smtpUser = process.env.BUILDSUDAN_SMTP_USER;
  const receiver = process.env.BUILDSUDAN_CONTACT_RECEIVER_EMAIL || smtpUser;
  if (!transporter || !receiver) return false;

  const applicationId = application._id.toString();
  const propertyAddress =
    application.serviceDetails?.propertyAddress ||
    application.serviceDetails?.location ||
    "Address not provided";
  const subject = hazardAlert
    ? `URGENT: Property safety alert for request ${applicationId}`
    : `Engineering assessment ready for request ${applicationId}`;
  const adminUrl = `${getFrontendBaseUrl()}/`;

  try {
    await transporter.sendMail({
      from: `"Build Sudan Assessments" <${smtpUser}>`,
      to: receiver,
      subject,
      text: [
        hazardAlert
          ? "An engineer reported a suspected explosive hazard. Inspection must remain halted pending review."
          : "An engineer submitted a property assessment. The report is available to view and download from the Admin Control Panel.",
        `Application ID: ${applicationId}`,
        `Property: ${propertyAddress}`,
        `Engineer: ${assessment.engineerName}`,
        `Submitted: ${assessment.submittedAt.toISOString()}`,
        `Admin panel: ${adminUrl}`,
      ].join("\n"),
    });
    return true;
  } catch (error) {
    console.error("Failed to send assessment admin notification", error);
    return false;
  }
}
