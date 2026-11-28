import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { Role } from "../models/Role.js";
import { User } from "../models/User.js";

function ensureDatabaseConnected(res) {
  if (Role.db.readyState !== 1 || User.db.readyState !== 1) {
    res.status(503).json({ message: "Database is not connected" });
    return false;
  }

  return true;
}

function normalizeRoleName(name) {
  const value = String(name || "")
    .trim()
    .toLowerCase();
  if (!value) {
    throw new Error("Role name is required");
  }

  return value;
}

function normalizeUsername(username) {
  const value = String(username || "")
    .trim()
    .toLowerCase();
  if (!value) {
    throw new Error("Username is required");
  }

  return value;
}

function normalizeOptionalName(value) {
  return String(value || "").trim();
}

export async function getRoles(req, res, next) {
  if (!ensureDatabaseConnected(res)) {
    return;
  }

  try {
    const roles = await Role.find().sort({ name: 1 });
    return res.json({ data: roles });
  } catch (error) {
    return next(error);
  }
}

export async function createRole(req, res, next) {
  if (!ensureDatabaseConnected(res)) {
    return;
  }

  try {
    const name = normalizeRoleName(req.body?.name);
    const description = String(req.body?.description || "").trim();

    const role = await Role.create({ name, description });
    return res.status(201).json({ message: "Role created", data: role });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Role already exists" });
    }

    if (error.message?.includes("Role name is required")) {
      return res.status(400).json({ message: error.message });
    }

    return next(error);
  }
}

export async function updateRole(req, res, next) {
  if (!ensureDatabaseConnected(res)) {
    return;
  }

  try {
    const existingRole = await Role.findById(req.params.id);
    if (!existingRole) {
      return res.status(404).json({ message: "Role not found" });
    }

    const nextName =
      req.body?.name !== undefined
        ? normalizeRoleName(req.body.name)
        : existingRole.name;
    const nextDescription =
      req.body?.description !== undefined
        ? String(req.body.description || "").trim()
        : existingRole.description;

    if (existingRole.name === "admin" && nextName !== "admin") {
      return res
        .status(400)
        .json({ message: "Admin role name cannot be changed" });
    }

    const updatedRole = await Role.findByIdAndUpdate(
      req.params.id,
      {
        name: nextName,
        description: nextDescription,
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (existingRole.name !== nextName) {
      await User.updateMany({ role: existingRole.name }, { role: nextName });
    }

    return res.json({ message: "Role updated", data: updatedRole });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Role already exists" });
    }

    if (error.message?.includes("Role name is required")) {
      return res.status(400).json({ message: error.message });
    }

    return next(error);
  }
}

export async function deleteRole(req, res, next) {
  if (!ensureDatabaseConnected(res)) {
    return;
  }

  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    if (role.name === "admin") {
      return res.status(400).json({ message: "Admin role cannot be deleted" });
    }

    const usersWithRole = await User.countDocuments({ role: role.name });
    if (usersWithRole > 0) {
      return res
        .status(400)
        .json({ message: "Role is assigned to users and cannot be deleted" });
    }

    await Role.findByIdAndDelete(req.params.id);
    return res.json({ message: "Role deleted" });
  } catch (error) {
    return next(error);
  }
}

export async function getUsers(req, res, next) {
  if (!ensureDatabaseConnected(res)) {
    return;
  }

  try {
    const users = await User.find()
      .select("username role createdAt updatedAt")
      .sort({ createdAt: -1 })
      .lean();
    return res.json({
      data: users.map((user) => ({ ...user, id: user._id.toString() })),
    });
  } catch (error) {
    return next(error);
  }
}

export async function createUser(req, res, next) {
  if (!ensureDatabaseConnected(res)) {
    return;
  }

  try {
    const username = normalizeUsername(req.body?.username);
    const password = String(req.body?.password || "");
    const role = normalizeRoleName(req.body?.role);

    if (!password || password.length < 4) {
      return res
        .status(400)
        .json({ message: "Password must be at least 4 characters" });
    }

    const roleExists = await Role.findOne({ name: role });
    if (!roleExists) {
      const availableRoles = await Role.find().select("name").sort({ name: 1 });
      const roleNames = availableRoles.map((item) => item.name).join(", ");
      return res.status(400).json({
        message: roleNames
          ? `Role does not exist. Available roles: ${roleNames}`
          : "Role does not exist. No roles found. Create a role first.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      passwordHash,
      role,
      firstName: normalizeOptionalName(req.body?.firstName),
      middleName: normalizeOptionalName(req.body?.middleName),
      lastName: normalizeOptionalName(req.body?.lastName),
      phone: normalizeOptionalName(req.body?.phone),
      email: String(req.body?.email || "")
        .trim()
        .toLowerCase(),
      address: {
        line1: normalizeOptionalName(req.body?.address?.line1),
        line2: normalizeOptionalName(req.body?.address?.line2),
        city: normalizeOptionalName(req.body?.address?.city),
        state: normalizeOptionalName(req.body?.address?.state),
        country: normalizeOptionalName(req.body?.address?.country),
        postalCode: normalizeOptionalName(req.body?.address?.postalCode),
      },
    });

    return res.status(201).json({
      message: "User created",
      data: {
        _id: user._id,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Username already exists" });
    }

    if (error.message?.includes("required")) {
      return res.status(400).json({ message: error.message });
    }

    return next(error);
  }
}

export async function updateUser(req, res, next) {
  if (!ensureDatabaseConnected(res)) {
    return;
  }

  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const updatePayload = {};

    if (req.body?.username !== undefined) {
      updatePayload.username = normalizeUsername(req.body.username);
    }

    if (req.body?.role !== undefined) {
      const nextRole = normalizeRoleName(req.body.role);
      const roleExists = await Role.findOne({ name: nextRole });
      if (!roleExists) {
        return res.status(400).json({ message: "Role does not exist" });
      }

      updatePayload.role = nextRole;
    }

    if (req.body?.firstName !== undefined) {
      updatePayload.firstName = normalizeOptionalName(req.body.firstName);
    }

    if (req.body?.middleName !== undefined) {
      updatePayload.middleName = normalizeOptionalName(req.body.middleName);
    }

    if (req.body?.lastName !== undefined) {
      updatePayload.lastName = normalizeOptionalName(req.body.lastName);
    }

    if (req.body?.phone !== undefined) {
      updatePayload.phone = normalizeOptionalName(req.body.phone);
    }

    if (req.body?.email !== undefined) {
      updatePayload.email = String(req.body.email || "")
        .trim()
        .toLowerCase();
    }

    if (req.body?.address !== undefined) {
      updatePayload.address = {
        ...(user.address || {}),
        line1: normalizeOptionalName(req.body.address?.line1),
        line2: normalizeOptionalName(req.body.address?.line2),
        city: normalizeOptionalName(req.body.address?.city),
        state: normalizeOptionalName(req.body.address?.state),
        country: normalizeOptionalName(req.body.address?.country),
        postalCode: normalizeOptionalName(req.body.address?.postalCode),
      };
    }

    if (req.body?.password !== undefined) {
      const password = String(req.body.password || "");
      if (!password || password.length < 4) {
        return res
          .status(400)
          .json({ message: "Password must be at least 4 characters" });
      }

      updatePayload.passwordHash = await bcrypt.hash(password, 10);
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updatePayload,
      {
        new: true,
        runValidators: true,
      },
    ).select("username role createdAt updatedAt");

    return res.json({ message: "User updated", data: updatedUser });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Username already exists" });
    }

    if (error.message?.includes("required")) {
      return res.status(400).json({ message: error.message });
    }

    return next(error);
  }
}

export async function deleteUser(req, res, next) {
  if (!ensureDatabaseConnected(res)) {
    return;
  }

  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role === "admin") {
      const adminCount = await User.countDocuments({ role: "admin" });
      if (adminCount <= 1) {
        return res
          .status(400)
          .json({ message: "Cannot delete the last admin user" });
      }
    }

    await User.findByIdAndDelete(req.params.id);
    return res.json({ message: "User deleted" });
  } catch (error) {
    return next(error);
  }
}
