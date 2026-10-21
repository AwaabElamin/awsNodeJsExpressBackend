const mongoose = require("mongoose");
const DB = require("../../lib/db");

const journalEntrySchema = new mongoose.Schema(
  {
    voucher_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Voucher",
      required: true,
    },
    account_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },
    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
    description: String,
  },
  {
    timestamps: { createdAt: "created_at" },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

module.exports = DB.getModel("property-management", "JournalEntry", journalEntrySchema);
