const mongoose = require("mongoose");
const DB = require("../../lib/db");

const featureSettingSchema = new mongoose.Schema(
  {
    feature: { type: String, required: true, unique: true, trim: true },
    is_active: { type: Boolean, default: false },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

module.exports = DB.getModel("property-management", "FeatureSetting", featureSettingSchema);
