const mongoose = require("mongoose");
const DB = require("../../lib/db");

const propertySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    address: { type: String, required: true },
    type: { type: String, required: true },
    sub_type: String,
    status: { type: String, default: "Vacant" },
    price: { type: Number, required: true },
    area: Number,
    units: { type: Number, default: 1 },
    bedrooms: Number,
    bathrooms: Number,
    image_url: String,
    owner_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    ownerships: [
      {
        ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        ownerName: String,
        percentage: Number,
      },
    ],
  },
  {
    timestamps: { createdAt: "created_at" },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

module.exports = DB.getModel("property-management", "Property", propertySchema);
