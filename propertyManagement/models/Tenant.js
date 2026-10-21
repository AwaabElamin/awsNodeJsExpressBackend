const mongoose = require("mongoose");
const DB = require("../../lib/db");

const tenantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
    national_id: String,
    property_id: { type: mongoose.Schema.Types.ObjectId, ref: "Property" },
    lease_end: Date,
    status: { type: String, default: "active" },
  },
  {
    timestamps: { createdAt: "created_at" },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

module.exports = DB.getModel("property-management", "Tenant", tenantSchema);
