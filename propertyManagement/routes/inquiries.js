const express = require("express");
const auth = require("../middleware/auth");
const Inquiry = require("../models/Inquiry");

const router = express.Router();

router.get("/", auth, async (req, res) => {
  if (!req.companyAdmin) {
    return res.status(403).json({ error: "Only Awaab LLC admins can view visitor inquiries" });
  }

  try {
    const inquiries = await Inquiry.find({})
      .sort({ created_at: -1 })
      .limit(250)
      .lean();
    res.json(inquiries.map((inquiry) => ({
      id: String(inquiry._id),
      propertyId: inquiry.property_id ? String(inquiry.property_id) : undefined,
      name: inquiry.name,
      email: inquiry.email,
      phone: inquiry.phone,
      message: inquiry.message,
      createdAt: inquiry.created_at,
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
