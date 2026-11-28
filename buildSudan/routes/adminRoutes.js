import { Router } from "express";
import {
  createRole,
  createUser,
  deleteRole,
  deleteUser,
  getRoles,
  getUsers,
  updateRole,
  updateUser
} from "../controllers/adminController.js";
import { requireAdminAuth } from "../middleware/adminAuth.js";

const router = Router();

router.use(requireAdminAuth);

router.get("/roles", getRoles);
router.post("/roles", createRole);
router.put("/roles/:id", updateRole);
router.delete("/roles/:id", deleteRole);

router.get("/users", getUsers);
router.post("/users", createUser);
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);

export default router;
