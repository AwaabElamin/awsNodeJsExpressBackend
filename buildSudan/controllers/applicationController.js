import mongoose from "mongoose";
import { Application } from "../models/Application.js";
import { User } from "../models/User.js";
import { sendAssessmentAdminNotice } from "../utils/mailer.js";

async function validateEngineerAssignments(assignedEngineerIds) {
  if (!Array.isArray(assignedEngineerIds)) {
    throw new Error("Assigned engineers must be provided as a list");
  }

  const ids = [...new Set(assignedEngineerIds.map((id) => String(id)))];
  if (ids.some((id) => !mongoose.isValidObjectId(id))) {
    throw new Error("Assigned engineers list contains an invalid user ID");
  }

  const engineers = await User.find({ _id: { $in: ids } })
    .select("_id role")
    .lean();

  if (
    engineers.length !== ids.length ||
    engineers.some(
      (user) =>
        !["engineer", "eng"].includes(
          String(user.role || "")
            .trim()
            .toLowerCase(),
        ),
    )
  ) {
    throw new Error("One or more assigned users are not engineers");
  }

  return ids;
}

function ensureDatabaseConnected(res) {
  if (Application.db.readyState !== 1) {
    res.status(503).json({ message: "Database is not connected" });
    return false;
  }

  return true;
}

export async function createApplication(req, res, next) {
  if (!ensureDatabaseConnected(res)) {
    return;
  }

  try {
    const requestData = { ...req.body };
    delete requestData.assignedEngineerIds;
    delete requestData.engineerAssessment;
    delete requestData.engineerHazardAlert;
    requestData.status = "new";
    const application = await Application.create(requestData);
    res.status(201).json({
      message: "Request submitted successfully",
      data: application,
    });
  } catch (error) {
    next(error);
  }
}

export async function getApplications(req, res, next) {
  if (!ensureDatabaseConnected(res)) {
    return;
  }

  try {
    const username = String(req.query?.username || "")
      .trim()
      .toLowerCase();
    if (!username) {
      return res.json({ data: [] });
    }

    const applications = await Application.find({ username })
      .sort({ createdAt: -1 })
      .limit(100);
    const publicApplications = applications.map((application) => {
      const data = application.toObject();
      delete data.assignedEngineerIds;
      delete data.engineerHazardAlert;
      if (data.status !== "approved") {
        delete data.engineerAssessment;
      }
      return data;
    });
    res.json({ data: publicApplications });
  } catch (error) {
    next(error);
  }
}

export async function getAdminApplications(req, res, next) {
  if (!ensureDatabaseConnected(res)) {
    return;
  }

  try {
    await Application.updateMany(
      {
        assignedEngineerIds: { $ne: [] },
        status: { $in: ["new", "reviewing"] },
      },
      { $set: { status: "under_assessment" } },
    );
    const applications = await Application.find()
      .sort({ createdAt: -1 })
      .limit(500);
    res.json({ data: applications });
  } catch (error) {
    next(error);
  }
}

export async function getEngineerApplications(req, res, next) {
  if (!ensureDatabaseConnected(res)) {
    return;
  }

  try {
    await Application.updateMany(
      {
        assignedEngineerIds: req.engineer.userId,
        status: { $in: ["new", "reviewing"] },
      },
      { $set: { status: "under_assessment" } },
    );
    const applications = await Application.find({
      assignedEngineerIds: req.engineer.userId,
    })
      .sort({ createdAt: -1 })
      .limit(500);
    return res.json({ data: applications });
  } catch (error) {
    return next(error);
  }
}

export async function submitEngineerAssessment(req, res, next) {
  if (!ensureDatabaseConnected(res)) {
    return;
  }

  try {
    const assessment = req.body?.assessment;
    if (
      !assessment ||
      typeof assessment !== "object" ||
      Array.isArray(assessment)
    ) {
      return res
        .status(400)
        .json({ message: "A valid assessment report is required" });
    }

    if (
      req.body?.hazardAlert &&
      assessment.safety?.explosiveHazard !== "Suspected Hazard Detected"
    ) {
      return res.status(400).json({
        message: "A hazard alert requires a suspected explosive hazard finding",
      });
    }

    if (
      !req.body?.hazardAlert &&
      assessment.safety?.explosiveHazard === "Suspected Hazard Detected"
    ) {
      return res.status(400).json({
        message:
          "Inspection cannot continue after a suspected explosive hazard",
      });
    }

    if (!req.body?.hazardAlert && !assessment.digitalSignature) {
      return res.status(400).json({
        message: "Engineer digital signature is required to submit the report",
      });
    }

    const application = await Application.findOneAndUpdate(
      {
        _id: req.params.id,
        assignedEngineerIds: req.engineer.userId,
        status: { $in: ["under_assessment", "new", "reviewing"] },
      },
      {
        $set: {
          [req.body?.hazardAlert
            ? "engineerHazardAlert"
            : "engineerAssessment"]: {
            ...assessment,
            submittedAt: new Date(),
            engineerName: req.engineer.fullName,
            engineerRegistrationNumber: req.engineer.registrationNumber,
          },
          ...(req.body?.hazardAlert
            ? {}
            : { status: "awaiting_admin_approval" }),
        },
      },
      { new: true, runValidators: true },
    );

    if (!application) {
      return res.status(404).json({
        message: "Assigned request not found or no longer available",
      });
    }

    const savedAssessment = req.body?.hazardAlert
      ? application.engineerHazardAlert
      : application.engineerAssessment;
    const notificationSent = await sendAssessmentAdminNotice({
      application,
      assessment: savedAssessment,
      hazardAlert: Boolean(req.body?.hazardAlert),
    });

    return res.json({
      message: req.body?.hazardAlert
        ? notificationSent
          ? "Hazard alert submitted and administration notified"
          : "Hazard alert saved. Administration will see it in the Admin Control Panel"
        : notificationSent
          ? "Assessment submitted and administration notified"
          : "Assessment saved. Administration will see it in the Admin Control Panel",
      data: savedAssessment,
      notificationSent,
    });
  } catch (error) {
    return next(error);
  }
}

export async function createAdminApplication(req, res, next) {
  if (!ensureDatabaseConnected(res)) {
    return;
  }

  try {
    const requestData = { ...req.body, status: "new" };
    delete requestData.engineerAssessment;
    delete requestData.engineerHazardAlert;
    const application = await Application.create(requestData);
    res.status(201).json({
      message: "Request created by admin",
      data: application,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateAdminApplication(req, res, next) {
  if (!ensureDatabaseConnected(res)) {
    return;
  }

  try {
    const allowedUpdates = {
      username: req.body.username,
      fullName: req.body.fullName,
      email: req.body.email,
      phone: req.body.phone,
      serviceType: req.body.serviceType,
      projectTitle: req.body.projectTitle,
      summary: req.body.summary,
      serviceDetails: req.body.serviceDetails,
      assignedEngineerIds: req.body.assignedEngineerIds,
      status: req.body.status,
    };

    const updatePayload = Object.fromEntries(
      Object.entries(allowedUpdates).filter(([, value]) => value !== undefined),
    );

    if (updatePayload.assignedEngineerIds !== undefined) {
      updatePayload.assignedEngineerIds = await validateEngineerAssignments(
        updatePayload.assignedEngineerIds,
      );
    }

    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({ message: "Request not found" });
    }

    const nextAssignments =
      updatePayload.assignedEngineerIds ??
      application.assignedEngineerIds.map((id) => id.toString());
    if (updatePayload.status === "new" && nextAssignments.length > 0) {
      return res.status(400).json({
        message: "Requests with assigned engineers cannot be marked new",
      });
    }
    if (
      updatePayload.status === "under_assessment" &&
      nextAssignments.length === 0
    ) {
      return res.status(400).json({
        message: "Assign at least one engineer before starting an assessment",
      });
    }
    if (
      ["awaiting_admin_approval", "approved"].includes(updatePayload.status) &&
      !application.engineerAssessment?.submittedAt
    ) {
      return res.status(400).json({
        message:
          "An engineer must submit an assessment before admin review or approval",
      });
    }

    Object.assign(application, updatePayload);
    if (
      updatePayload.assignedEngineerIds !== undefined &&
      updatePayload.status === undefined
    ) {
      if (
        nextAssignments.length > 0 &&
        ["new", "under_assessment"].includes(application.status)
      ) {
        application.status = "under_assessment";
      } else if (
        nextAssignments.length === 0 &&
        application.status === "under_assessment"
      ) {
        application.status = "new";
      }
    }
    await application.save();

    return res.json({
      message: "Request updated",
      data: application,
    });
  } catch (error) {
    if (
      error.message?.includes("Assigned engineers") ||
      error.message?.includes("assigned users")
    ) {
      return res.status(400).json({ message: error.message });
    }

    return next(error);
  }
}

export async function deleteAdminApplication(req, res, next) {
  if (!ensureDatabaseConnected(res)) {
    return;
  }

  try {
    const application = await Application.findByIdAndDelete(req.params.id);
    if (!application) {
      return res.status(404).json({ message: "Request not found" });
    }

    return res.json({ message: "Request deleted" });
  } catch (error) {
    return next(error);
  }
}
