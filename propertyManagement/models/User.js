const mongoose = require("mongoose");
const DB = require("../../lib/db");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password_hash: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "manager", "owner", "tenant", "contractor"],
      required: true,
    },
    status: { type: String, default: "active" },
    phone: String,
    bank_name: String,
    account_number: String,
    iban: String,
    last_login: Date,
  },
  {
    timestamps: { createdAt: "created_at" },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

module.exports = DB.getModel("property-management", "User", userSchema);
