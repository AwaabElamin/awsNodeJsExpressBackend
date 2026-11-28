import mongoose from "mongoose";
import { connection } from "../connection.js";

const requestSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    serviceType: {
      type: String,
      required: true,
      enum: [
        "engineering_assessment",
        "quotation",
        "rent_or_sell_property",
        "job_application",
        "donation_request",
        "transaction_clearance",
        "partner_application",
      ],
    },
    projectTitle: {
      type: String,
      required: true,
      trim: true,
    },
    summary: {
      type: String,
      required: true,
      trim: true,
    },
    serviceDetails: {
      location: {
        type: String,
        trim: true,
      },
      budgetRange: {
        type: String,
        trim: true,
      },
      preferredTimeline: {
        type: String,
        trim: true,
      },
      organizationName: {
        type: String,
        trim: true,
      },
      cvLink: {
        type: String,
        trim: true,
      },
      transactionReference: {
        type: String,
        trim: true,
      },
      propertyOwnerName: {
        type: String,
        trim: true,
      },
      propertyOwnerNationalId: {
        type: String,
        trim: true,
      },
      buildingType: {
        type: String,
        enum: [
          "Residential",
          "Commercial",
          "Administration",
          "Hospitality",
          "Services",
          "Healthcare",
          "Other",
          "",
        ],
      },
      propertyAddress: {
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
      propertyCity: {
        type: String,
        trim: true,
      },
      propertyArea: {
        type: String,
        trim: true,
      },
      streetNameNumber: {
        type: String,
        trim: true,
      },
      propertyNumber: {
        type: String,
        trim: true,
      },
      propertyAccessConsent: {
        type: Boolean,
      },
      attachments: {
        identityDocument: {
          fileName: { type: String, trim: true },
          contentType: { type: String, trim: true },
          dataUrl: { type: String },
        },
        propertySearchCertificate: {
          fileName: { type: String, trim: true },
          contentType: { type: String, trim: true },
          dataUrl: { type: String },
        },
        accessAuthorization: {
          fileName: { type: String, trim: true },
          contentType: { type: String, trim: true },
          dataUrl: { type: String },
        },
      },
    },
    assignedEngineerIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
    engineerAssessment: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    engineerHazardAlert: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    status: {
      type: String,
      enum: [
        "new",
        "under_assessment",
        "awaiting_admin_approval",
        "approved",
        "rejected",
      ],
      default: "new",
    },
  },
  {
    timestamps: true,
  },
);

export const Request = connection.model("Request", requestSchema, "requests");
export const Application = Request;
