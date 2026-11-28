import mongoose from "mongoose";
import { connection } from "../connection.js";

const addressSchema = new mongoose.Schema(
  {
    line1: {
      type: String,
      trim: true,
    },
    line2: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
    postalCode: {
      type: String,
      trim: true,
    },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      required: true,
      default: "user",
    },
    firstName: {
      type: String,
      trim: true,
    },
    middleName: {
      type: String,
      trim: true,
    },
    fatherName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    nationalId: {
      type: String,
      trim: true,
    },
    dateOfBirth: {
      type: String,
      trim: true,
    },
    phoneCountryCode: {
      type: String,
      trim: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    // The source controller uses these fields, but its schema did not persist them.
    emailVerified: Boolean,
    emailVerificationTokenHash: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    emailVerificationSentAt: { type: Date, select: false },
    poBoxPrimary: {
      type: String,
      trim: true,
    },
    poBoxSecondary: {
      type: String,
      trim: true,
    },
    currentCountry: {
      type: String,
      trim: true,
    },
    currentCity: {
      type: String,
      trim: true,
    },
    currentAddressLine: {
      type: String,
      trim: true,
    },
    currentPhone: {
      type: String,
      trim: true,
    },
    sudanState: {
      type: String,
      trim: true,
    },
    locality: {
      type: String,
      trim: true,
    },
    neighborhood: {
      type: String,
      trim: true,
    },
    sudanPhone: {
      type: String,
      trim: true,
    },
    address: {
      type: addressSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  },
);

export const User = connection.model("User", userSchema);
