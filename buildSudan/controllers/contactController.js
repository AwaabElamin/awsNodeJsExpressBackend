import { getMailTransporter } from "../utils/mailer.js";

function isValidEmail(value) {
  return /^\S+@\S+\.\S+$/.test(value);
}

export async function sendContactMessage(req, res) {
  const name = String(req.body?.name || "").trim();
  const email = String(req.body?.email || "")
    .trim()
    .toLowerCase();
  const subject = String(req.body?.subject || "").trim();
  const message = String(req.body?.message || "").trim();

  if (!name || !email || !subject || !message) {
    return res
      .status(400)
      .json({ message: "Name, email, subject, and message are required" });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ message: "A valid email is required" });
  }

  const transporter = getMailTransporter();
  if (!transporter) {
    return res.status(503).json({
      message:
        "Email sending is not configured on the server. Set BUILDSUDAN_SMTP_USER plus the BUILDSUDAN_GOOGLE OAuth credentials (or BUILDSUDAN_SMTP_PASS).",
    });
  }

  const receiver = process.env.BUILDSUDAN_CONTACT_RECEIVER_EMAIL || process.env.BUILDSUDAN_SMTP_USER;

  try {
    await transporter.sendMail({
      from: `"Build Sudan Contact Form" <${process.env.BUILDSUDAN_SMTP_USER}>`,
      to: receiver,
      replyTo: email,
      subject: `[Contact Us] ${subject}`,
      text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
    });

    return res.json({ message: "Your message was sent successfully." });
  } catch (error) {
    console.error("Failed to send contact email", error);
    return res.status(500).json({
      message: "Failed to send your message. Please try again later.",
    });
  }
}
