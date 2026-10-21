const mongoose = require("mongoose");
const DB = require("../../lib/db");
const { randomUUID } = require("crypto");

const maintenanceSchema = new mongoose.Schema({
  id: { type: String, unique: true, default: randomUUID },
  title: { type: String, required: true },
  description: String,
  property_id: mongoose.Schema.Types.ObjectId,
  tenant_id: mongoose.Schema.Types.ObjectId,
  contractor_id: mongoose.Schema.Types.ObjectId,
  priority: { type: String, default: "medium" },
  status: { type: String, default: "pending" },
  date_submitted: { type: Date, default: Date.now },
  cost: Number,
  invoice_status: { type: String, default: "pending" },
  contractor_notes: String,
  created_at: { type: Date, default: Date.now },
});

module.exports = DB.getModel("property-management", "Maintenance", maintenanceSchema);
