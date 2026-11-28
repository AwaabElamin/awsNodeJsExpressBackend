import mongoose from "mongoose";
import { connection } from "../connection.js";

const settingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    value: {
      type: String,
      required: true,
      trim: true
    },
    updatedBy: {
      type: String,
      trim: true,
      default: "system"
    }
  },
  {
    timestamps: true
  }
);

export const Setting = connection.model("Setting", settingSchema);
