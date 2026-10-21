const mongoose = require("mongoose");
const DB = require("../../lib/db");

const payoutRequestSchema = new mongoose.Schema(
  {
    owner_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: { type: Number, required: true },
    status: {
      type: String,
      default: "pending",
      enum: ["pending", "approved", "rejected", "paid"],
    },
    request_date: { type: Date, default: Date.now },
    processed_date: Date,
    notes: String,
    bank_details_snapshot: String,
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

module.exports = DB.getModel("property-management", "PayoutRequest", payoutRequestSchema);
