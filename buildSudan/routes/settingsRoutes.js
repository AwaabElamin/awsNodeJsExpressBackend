import { Router } from "express";
import {
  adminLogin,
  engineerLogin,
  loginClientUser,
  registerClientUser,
  resendClientVerification,
  updateClientProfile,
  updateEngineerPassword,
  verifyClientEmail,
} from "../controllers/settingsController.js";
import { requireEngineerAuth } from "../middleware/engineerAuth.js";

const router = Router();

router.post("/public/register", registerClientUser);
router.post("/public/login", loginClientUser);
router.post("/public/verify-email", verifyClientEmail);
router.post("/public/resend-verification", resendClientVerification);
router.post("/public/engineer/login", engineerLogin);
router.put("/public/profile", updateClientProfile);
router.put("/engineer/password", requireEngineerAuth, updateEngineerPassword);
router.post("/admin/login", adminLogin);

export default router;
