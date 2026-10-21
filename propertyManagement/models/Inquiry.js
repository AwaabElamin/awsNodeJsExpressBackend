const mongoose = require("mongoose");
const DB = require("../../lib/db");

const inquirySchema = new mongoose.Schema(
  {
    property_id: { type: mongoose.Schema.Types.ObjectId, ref: "Property" },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
    message: String,
  },
  {
    timestamps: { createdAt: "created_at" },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

module.exports = DB.getModel("property-management", "Inquiry", inquirySchema);
