const mongoose = require("mongoose");
const DB = require("../../lib/db");

const accountSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
    balance: { type: Number, default: 0 },
    is_system: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: "created_at" },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

module.exports = DB.getModel("property-management", "Account", accountSchema);
