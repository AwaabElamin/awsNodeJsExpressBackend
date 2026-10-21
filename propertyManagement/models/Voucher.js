const mongoose = require("mongoose");
const DB = require("../../lib/db");

const voucherSchema = new mongoose.Schema(
  {
    serial_number: { type: String, required: true, unique: true },
    type: { type: String, required: true },
    category: String,
    date: { type: Date, default: Date.now },
    description: String,
    amount: { type: Number, required: true },
    base_amount: { type: Number, default: 0 },
    method: String,
    bank_name: String,
    reference_number: String,
    property_id: { type: mongoose.Schema.Types.ObjectId, ref: "Property" },
    tenant_id: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant" },
    owner_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    contract_id: { type: mongoose.Schema.Types.ObjectId, ref: "Contract" },
    months_covered: { type: Number, default: 0 },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    is_reversed: { type: Boolean, default: false },
    is_vat_applicable: { type: Boolean, default: false },
    vat_amount: { type: Number, default: 0 },
    deduct_commission: { type: Boolean, default: false },
    commission_amount: { type: Number, default: 0 },
    attachment_url: String,
  },
  {
    timestamps: { createdAt: "created_at" },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

module.exports = DB.getModel("property-management", "Voucher", voucherSchema);
