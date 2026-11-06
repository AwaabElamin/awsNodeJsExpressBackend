const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const JwtManager = require("../../jwt/jwtManager");
const auth = require("../middleware/auth");
const User = require("../models/User");

const toFrontendUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
  phone: user.phone,
  bankName: user.bank_name,
  accountNumber: user.account_number,
  iban: user.iban,
});

router.get("/me", auth, (req, res) => {
  if (!req.propertyUser) {
    return res.status(403).json({ error: "Property-management access required" });
  }
  return res.json({ user: toFrontendUser(req.propertyUser) });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email: String(email || "").trim().toLowerCase() });
    if (!user || user.status !== "active" || user.role === "admin") {
      return res.status(401).json({ error: "Auth failed" });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: "Auth failed" });
    }

    const token = new JwtManager().generate({
      userId: String(user._id),
      role: user.role,
      email: user.email,
    });

    user.last_login = new Date();
    await user.save();

    res.status(200).json({ token, user: toFrontendUser(user) });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
