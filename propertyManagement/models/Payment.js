const mongoose = require("mongoose");
const DB = require("../../lib/db");
const { randomUUID } = require("crypto");

const paymentSchema = new mongoose.Schema({
  id: { type: String, unique: true, default: randomUUID },
  tenant_id: mongoose.Schema.Types.ObjectId,
  property_id: mongoose.Schema.Types.ObjectId,
  amount: { type: Number, required: true },
  date: { type: Date, required: true },
  status: { type: String, required: true },
  method: String,
  reference: String,
  proof_url: String,
  created_at: { type: Date, default: Date.now },
});

module.exports = DB.getModel("property-management", "Payment", paymentSchema);
