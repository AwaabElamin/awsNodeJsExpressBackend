const mongoose = require("mongoose");
const DB = require("../../lib/db");

const featureSettingsSchema = new mongoose.Schema(
  {
    accounting: { type: Boolean, default: true },
    contracts: { type: Boolean, default: true },
    landlords: { type: Boolean, default: true },
    maintenance: { type: Boolean, default: true },
    messages: { type: Boolean, default: true },
    payments: { type: Boolean, default: true },
    tenants: { type: Boolean, default: true },
    users: { type: Boolean, default: true },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

module.exports = DB.getModel("property-management", "FeatureSettings", featureSettingsSchema);
