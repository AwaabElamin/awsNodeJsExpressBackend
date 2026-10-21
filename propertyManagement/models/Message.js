const mongoose = require("mongoose");
const DB = require("../../lib/db");

const messageSchema = new mongoose.Schema(
  {
    sender_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    subject: String,
    body: String,
    message_type: { type: String, default: "direct" },
    is_read: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: "created_at" },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

module.exports = DB.getModel("property-management", "Message", messageSchema);
