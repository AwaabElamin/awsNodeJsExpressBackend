const mongoose = require("mongoose");
const DB = require("../../lib/db");

const maintenanceRequestSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    property_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },
    tenant_id: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant" },
    contractor_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    priority: { type: String, default: "medium" },
    status: { type: String, default: "pending" },
    date_submitted: { type: Date, default: Date.now },
    cost: Number,
    invoice_status: { type: String, default: "pending" },
    contractor_notes: String,
  },
  {
    timestamps: { createdAt: "created_at" },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

module.exports = DB.getModel("property-management", "MaintenanceRequest", maintenanceRequestSchema);
