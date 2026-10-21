const mongoose = require("mongoose");
const DB = require("../../lib/db");
const { randomUUID } = require("crypto");

const financialSchema = new mongoose.Schema({
  id: { type: String, unique: true, default: randomUUID },
  property_id: mongoose.Schema.Types.ObjectId,
  user_id: mongoose.Schema.Types.ObjectId,
  type: { type: String, enum: ["income", "expense", "payout"], required: true },
  category: String,
  amount: { type: Number, required: true },
  description: String,
  date: { type: Date, default: Date.now },
  added_by: mongoose.Schema.Types.ObjectId,
  created_at: { type: Date, default: Date.now },
});

module.exports = DB.getModel("property-management", "Financial", financialSchema);
