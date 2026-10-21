const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const auth = require("../middleware/auth");
const Payment = require("../models/Voucher"); // Payments are essentially Vouchers
const Property = require("../models/Property");
const Tenant = require("../models/Tenant");
const User = require("../models/User");
const AccountingService = require("../services/accountingService");

router.get("/", auth, async (req, res) => {
  try {
    const { role, userId } = req.userData;
    let query = { category: { $in: ["rent", "security_deposit"] } };
    if (role === "tenant") {
      const user = await User.findById(userId);
      const tenant = await Tenant.findOne({ email: user.email });
      if (tenant) query.tenant_id = tenant._id;
      else return res.json([]);
    }
    const vouchers = await Payment.find(query)
      .populate("tenant_id", "name")
      .populate("property_id", "name")
      .sort({ date: -1 });

    const formatted = vouchers.map((v) => ({
      id: v._id,
      tenantId: v.tenant_id?._id,
      tenantName: v.tenant_id?.name,
      propertyId: v.property_id?._id,
      propertyName: v.property_id?.name,
      amount: v.amount,
      date: v.date.toISOString().split("T")[0],
      status: v.is_reversed ? "reversed" : "paid",
      method: v.method,
      reference: v.reference_number,
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
