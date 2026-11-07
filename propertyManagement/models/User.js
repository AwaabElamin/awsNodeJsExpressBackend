const mongoose = require("mongoose");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
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

// Creates the owner profile an Awaaab Client receives on first entry. The
// account signs in through the Awaaab session, so the stored password is an
// unguessable placeholder that satisfies the schema.
userSchema.statics.provisionOwnerForAwaabAccount = async function (account, email) {
  const existing = await this.findOne({ email });
  if (existing) return existing;

  const fullName = [account.firstname, account.lastname]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(" ");
  const placeholderSecret = crypto.randomBytes(32).toString("hex");

  try {
    return await this.create({
      name: fullName || email,
      email,
      password_hash: await bcrypt.hash(placeholderSecret, 10),
      role: "owner",
      status: "active",
      phone: account.phone || undefined,
    });
  } catch (error) {
    if (error && error.code === 11000) {
      return this.findOne({ email });
    }
    throw error;
  }
};

module.exports = DB.getModel("property-management", "User", userSchema);
