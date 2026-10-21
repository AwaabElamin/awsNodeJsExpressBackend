const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const auth = require("../middleware/auth");
const User = require("../models/User");

router.get("", auth, async (req, res) => {
  if (!req.companyAdmin) {
    return res.status(403).json({ error: "Only Awaab LLC admins can manage property users" });
  }

  try {
    const users = await User.find({}).sort({ created_at: -1 });
    const formattedUsers = users.map((user) => ({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      phone: user.phone,
      bankName: user.bank_name,
      accountNumber: user.account_number,
      iban: user.iban,
      lastLogin: user.last_login
        ? user.last_login.toISOString().replace("T", " ").substring(0, 16)
        : null,
    }));
    res.json(formattedUsers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("", auth, async (req, res) => {
  const {
    name,
    email,
    password,
    role,
    status,
    phone,
    bankName,
    accountNumber,
    iban,
  } = req.body;
  if (!req.companyAdmin) {
    return res.status(403).json({ error: "Only Awaab LLC admins can create property users" });
  }
  if (!["manager", "owner", "tenant", "contractor"].includes(role)) {
    return res.status(400).json({ error: "Invalid property user role" });
  }
  if (!name || !email || typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ error: "Name, email, and a password of at least 8 characters are required" });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    await User.create({
      name,
      email: email.trim().toLowerCase(),
      password_hash: hash,
      role,
      status,
      phone,
      bank_name: bankName,
      account_number: accountNumber,
      iban,
    });
    res.status(201).json({ message: "User created" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


const updateUser = async (req, res) => {
  if (!req.companyAdmin) {
    return res.status(403).json({ error: "Only Awaab LLC admins can update property users" });
  }
  const { id } = req.params;
  const {
    name,
    email,
    phone,
    bankName,
    accountNumber,
    iban,
    role,
    status,
    password,
  } = req.body;
  if (role && !["manager", "owner", "tenant", "contractor"].includes(role)) {
    return res.status(400).json({ error: "Invalid property user role" });
  }
  if (password && password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  try {
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (name) user.name = name;
    if (email) user.email = email.trim().toLowerCase();
    if (phone) user.phone = phone;
    if (bankName) user.bank_name = bankName;
    if (accountNumber) user.account_number = accountNumber;
    if (iban) user.iban = iban;
    if (role) user.role = role;
    if (status) user.status = status;
    if (password) user.password_hash = await bcrypt.hash(password, 10);

    await user.save();

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      bankName: user.bank_name,
      iban: user.iban,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

router.patch("/:id", auth, updateUser);
router.put("/:id", auth, updateUser);

router.delete("/:id", auth, async (req, res) => {
  if (!req.companyAdmin) {
    return res.status(403).json({ error: "Only Awaab LLC admins can delete property users" });
  }
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
  
});

module.exports = router;
