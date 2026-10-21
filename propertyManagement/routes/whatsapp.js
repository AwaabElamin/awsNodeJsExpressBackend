const express = require("express");
const { rateLimit } = require("express-rate-limit");
const auth = require("../middleware/auth");

const router = express.Router();
const sendLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many WhatsApp messages. Please try again later." },
});

router.post("/send", auth, sendLimit, async (req, res) => {
  if (!req.companyAdmin) {
    return res.status(403).json({ error: "Only Awaab LLC admins can send WhatsApp messages" });
  }

  const { toPhoneNumber, message, apiUrl, accessToken } = req.body;
  if (
    typeof toPhoneNumber !== "string" ||
    !/^\+?[1-9]\d{7,14}$/.test(toPhoneNumber) ||
    typeof message !== "string" ||
    !message.trim() ||
    message.length > 4096 ||
    typeof accessToken !== "string" ||
    accessToken.length < 1 ||
    accessToken.length > 4096 ||
    typeof apiUrl !== "string" ||
    apiUrl.length > 300
  ) {
    return res.status(400).json({ error: "Please provide valid WhatsApp message settings" });
  }

  let endpoint;
  try {
    endpoint = new URL(apiUrl);
  } catch {
    return res.status(400).json({ error: "Invalid WhatsApp API URL" });
  }

  if (
    endpoint.protocol !== "https:" ||
    endpoint.hostname !== "graph.facebook.com" ||
    endpoint.port ||
    endpoint.username ||
    endpoint.password ||
    endpoint.search ||
    endpoint.hash ||
    !/^\/v\d+\.\d+\/\d+\/messages$/.test(endpoint.pathname)
  ) {
    return res.status(400).json({ error: "WhatsApp API URL must be a valid Meta Graph messages endpoint" });
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toPhoneNumber,
        type: "text",
        text: { body: message.trim() },
      }),
      signal: AbortSignal.timeout(10000),
    });

    const result = await response.json().catch(() => null);
    if (!response.ok) {
      return res.status(502).json({
        error: result?.error?.message || "WhatsApp provider rejected the message",
      });
    }

    return res.json({ message: "WhatsApp message sent" });
  } catch (error) {
    return res.status(502).json({
      error: error.name === "TimeoutError"
        ? "WhatsApp provider request timed out"
        : "Unable to reach WhatsApp provider",
    });
  }
});

module.exports = router;
