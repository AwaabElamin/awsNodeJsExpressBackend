import { Router } from "express";
import {
  createAdminApplication,
  createApplication,
  deleteAdminApplication,
  getAdminApplications,
  getEngineerApplications,
  getApplications,
  submitEngineerAssessment,
  updateAdminApplication,
} from "../controllers/applicationController.js";
import { requireAdminAuth } from "../middleware/adminAuth.js";
import { requireEngineerAuth } from "../middleware/engineerAuth.js";

const router = Router();

router.get("/", getApplications);
router.post("/", createApplication);
router.get("/engineer/assigned", requireEngineerAuth, getEngineerApplications);
router.post(
  "/engineer/:id/assessment",
  requireEngineerAuth,
  submitEngineerAssessment,
);
router.get("/admin/all", requireAdminAuth, getAdminApplications);
router.post("/admin", requireAdminAuth, createAdminApplication);
router.put("/admin/:id", requireAdminAuth, updateAdminApplication);
router.delete("/admin/:id", requireAdminAuth, deleteAdminApplication);

router.get("/requests", getApplications);
router.post("/requests", createApplication);
router.get("/admin/requests", requireAdminAuth, getAdminApplications);
router.post("/admin/requests", requireAdminAuth, createAdminApplication);
router.put("/admin/requests/:id", requireAdminAuth, updateAdminApplication);
router.delete("/admin/requests/:id", requireAdminAuth, deleteAdminApplication);

export default router;
