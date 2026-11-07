const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const JwtManager = require("../../jwt/jwtManager");
const auth = require("../middleware/auth");
const requireAwaabClient = require("../middleware/requireAwaabClient");
const awaabUsers = require("../../models/users");
const User = require("../models/User");

const PLATFORM_ID = "property-management";

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

// First-time entry for an Awaaab Client: creates their own Property Management
// office as an owner, mirroring POST /auto/user and POST /groceries/user.
router.post("/provision", requireAwaabClient, async (req, res, next) => {
  try {
    const email = req.awaabEmail;
    const existing = await User.findOne({ email });
    if (existing && existing.status !== "active") {
      return res.status(403).json({ error: "Property account is inactive" });
    }

    const user =
      existing || (await User.provisionOwnerForAwaabAccount(req.awaabAccount, email));
    await awaabUsers.enablePlatform(email, PLATFORM_ID);

    return res.status(existing ? 200 : 201).json({ user: toFrontendUser(user) });
  } catch (error) {
    return next(error);
  }
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
