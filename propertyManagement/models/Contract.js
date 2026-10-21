const mongoose = require("mongoose");
const DB = require("../../lib/db");

const contractSchema = new mongoose.Schema(
  {
    contract_number: { type: String, required: true, unique: true },
    tenant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    property_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    amount: { type: Number, required: true },
    status: { type: String, default: "active" },
    file_url: String,
  },
  {
    timestamps: { createdAt: "created_at" },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

module.exports = DB.getModel("property-management", "Contract", contractSchema);
