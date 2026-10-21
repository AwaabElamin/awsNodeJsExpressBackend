const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Message = require("../models/Message");

router.get("/inbox", auth, async (req, res) => {
  try {
    const userId = req.userData ? req.userData.userId : null;
    const messages = await Message.find({
      $or: [{ receiver_id: userId }, { message_type: "announcement" }],
    })
      .populate("sender_id", "name role")
      .sort({ created_at: -1 });

    const formatted = messages.map((m) => ({
      id: m._id,
      senderId: m.sender_id?._id,
      senderName: m.sender_id?.name,
      senderRole: m.sender_id?.role,
      subject: m.subject,
      body: m.body,
      type: m.message_type,
      isRead: m.is_read,
      createdAt: m.created_at,
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/sent", auth, async (req, res) => {
  try {
    const userId = req.userData ? req.userData.userId : null;
    const messages = await Message.find({ sender_id: userId })
      .populate("receiver_id", "name")
      .sort({ created_at: -1 });

    const formatted = messages.map((m) => ({
      id: m._id,
      receiverName: m.receiver_id?.name,
      subject: m.subject,
      body: m.body,
      type: m.message_type,
      isRead: m.is_read,
      createdAt: m.created_at,
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", auth, async (req, res) => {
  const { receiverId, subject, body, type } = req.body;
  try {
    const userId = req.userData ? req.userData.userId : null;
    await Message.create({
      sender_id: userId,
      receiver_id: receiverId || null,
      subject,
      body,
      message_type: type || "direct",
    });
    res.status(201).json({ message: "Message sent" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
