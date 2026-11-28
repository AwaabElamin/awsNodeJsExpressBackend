import { Setting } from "../models/Setting.js";
import { User } from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  RESEND_COOLDOWN_MS,
  createVerificationToken,
  hashToken,
  sendVerificationEmail,
} from "../utils/emailVerification.js";

export function adminLogin(req, res) {
  const jwtSecret = process.env.BUILDSUDAN_ADMIN_JWT_SECRET;

  if (!jwtSecret) {
    return res.status(500).json({
      message: "Admin authentication is not configured on the server",
    });
  }

  if (User.db.readyState !== 1) {
    return res.status(503).json({ message: "Database is not connected" });
  }

  const username = String(req.body?.username || "")
    .trim()
    .toLowerCase();
  const password = String(req.body?.password || "");

  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Username and password are required" });
  }

  return User.findOne({ username })
    .then(async (user) => {
      if (!user || user.role !== "admin") {
        return res
          .status(401)
          .json({ message: "Invalid admin username or password" });
      }

      const matches = await bcrypt.compare(password, user.passwordHash);
      if (!matches) {
        return res
          .status(401)
          .json({ message: "Invalid admin username or password" });
      }

      const token = jwt.sign(
        {
          sub: user._id.toString(),
          username: user.username,
          role: user.role,
        },
        jwtSecret,
        { expiresIn: "8h" },
      );

      return res.json({
        token,
        username: user.username,
        role: user.role,
        expiresIn: "8h",
      });
    })
    .catch(() =>
      res.status(500).json({ message: "Failed to process admin login" }),
    );
}

export async function engineerLogin(req, res) {
  const jwtSecret = process.env.BUILDSUDAN_ADMIN_JWT_SECRET;
  if (!jwtSecret) {
    return res.status(500).json({
      message: "Engineer authentication is not configured on the server",
    });
  }

  if (User.db.readyState !== 1) {
    return res.status(503).json({ message: "Database is not connected" });
  }

  const username = String(req.body?.username || "")
    .trim()
    .toLowerCase();
  const password = String(req.body?.password || "");
  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Username and password are required" });
  }

  try {
    const user = await User.findOne({ username });
    const normalizedRole = String(user?.role || "")
      .trim()
      .toLowerCase();
    const isEngineer = ["engineer", "eng"].includes(normalizedRole);
    if (
      !user ||
      !isEngineer ||
      !(await bcrypt.compare(password, user.passwordHash))
    ) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const token = jwt.sign(
      { sub: user._id.toString(), username: user.username, role: "engineer" },
      jwtSecret,
      { expiresIn: "8h" },
    );

    return res.json({
      token,
      username: user.username,
      userId: user._id.toString(),
      fullName:
        [user.firstName, user.middleName, user.lastName]
          .filter(Boolean)
          .join(" ") || user.username,
      registrationNumber: user.nationalId || user._id.toString(),
      role: "engineer",
      expiresIn: "8h",
    });
  } catch {
    return res
      .status(500)
      .json({ message: "Failed to process engineer login" });
  }
}

export async function updateEngineerPassword(req, res) {
  if (!ensureDatabaseConnected(res)) {
    return;
  }

  const currentPassword = String(req.body?.currentPassword || "");
  const newPassword = String(req.body?.newPassword || "");
  if (!currentPassword || newPassword.length < 8) {
    return res.status(400).json({
      message:
        "Current password and a new password of at least 8 characters are required",
    });
  }

  try {
    const user = await User.findById(req.engineer.userId);
    const normalizedRole = String(user?.role || "")
      .trim()
      .toLowerCase();
    if (!user || !["engineer", "eng"].includes(normalizedRole)) {
      return res.status(404).json({ message: "Engineer account not found" });
    }

    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
    return res.json({ message: "Password updated successfully" });
  } catch {
    return res.status(500).json({ message: "Failed to update password" });
  }
}

function ensureDatabaseConnected(res) {
  if (Setting.db.readyState !== 1 || User.db.readyState !== 1) {
    res.status(503).json({ message: "Database is not connected" });
    return false;
  }

  return true;
}

function normalizeClientName(value) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    throw new Error("Required personal information is missing");
  }

  return normalized;
}

function normalizeOptionalText(value) {
  return String(value ?? "").trim();
}

export async function registerClientUser(req, res, next) {
  if (!ensureDatabaseConnected(res)) {
    return;
  }

  try {
    const username = String(req.body?.username || "")
      .trim()
      .toLowerCase();
    const password = String(req.body?.password || "");
    const confirmPassword = String(req.body?.confirmPassword || "");
    const firstName = normalizeClientName(req.body?.firstName);
    const fatherName = normalizeClientName(req.body?.fatherName);
    const lastName = normalizeClientName(req.body?.lastName);
    const nationalId = normalizeClientName(req.body?.nationalId);
    const dateOfBirth = normalizeClientName(req.body?.dateOfBirth);
    const phoneCountryCode = normalizeClientName(req.body?.phoneCountryCode);
    const phoneNumber = normalizeClientName(req.body?.phoneNumber);
    const rawPhone = String(req.body?.phone || "").trim();
    const phone =
      rawPhone ||
      [phoneCountryCode, phoneNumber].filter(Boolean).join(" ").trim();
    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase();
    const address = req.body?.address || {};
    const currentAddressLine = normalizeOptionalText(
      req.body?.currentAddressLine || address.line1,
    );
    const currentCountry = normalizeOptionalText(
      req.body?.currentCountry || address.country,
    );
    const currentCity = normalizeOptionalText(
      req.body?.currentCity || address.city,
    );
    const currentPhone = normalizeClientName(req.body?.currentPhone);
    const sudanState = normalizeClientName(
      req.body?.sudanState || address.state,
    );
    const locality = normalizeClientName(req.body?.locality);
    const neighborhood = normalizeClientName(req.body?.neighborhood);
    const sudanPhone = normalizeClientName(req.body?.sudanPhone);
    const poBoxPrimary = normalizeOptionalText(
      req.body?.poBoxPrimary || address.line2,
    );
    const poBoxSecondary = normalizeOptionalText(req.body?.poBoxSecondary);

    if (!username || !password || password.length < 4) {
      return res.status(400).json({
        message:
          "Username and password are required. Password must be at least 4 characters.",
      });
    }

    if (!confirmPassword || password !== confirmPassword) {
      return res
        .status(400)
        .json({ message: "Password and confirm password must match" });
    }

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: "A valid email is required" });
    }

    if (!phone) {
      return res.status(400).json({ message: "Phone number is required" });
    }

    if (!currentAddressLine || !currentCity || !sudanState || !currentCountry) {
      return res
        .status(400)
        .json({ message: "Complete address information is required" });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ message: "Username already exists" });
    }

    if (await User.exists({ email })) {
      return res.status(409).json({
        code: "EMAIL_IN_USE",
        message: "This email address is already registered",
      });
    }

    const verification = createVerificationToken();
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      passwordHash,
      role: "user",
      emailVerified: false,
      emailVerificationTokenHash: verification.hash,
      emailVerificationExpires: verification.expires,
      emailVerificationSentAt: new Date(),
      firstName,
      fatherName,
      middleName: fatherName || String(req.body?.middleName || "").trim(),
      lastName,
      nationalId,
      dateOfBirth,
      phoneCountryCode,
      phoneNumber,
      phone,
      email,
      poBoxPrimary,
      poBoxSecondary,
      currentCountry,
      currentCity,
      currentAddressLine,
      currentPhone,
      sudanState,
      locality,
      neighborhood,
      sudanPhone,
      address: {
        line1: currentAddressLine || String(address.line1 || "").trim(),
        line2: poBoxPrimary || String(address.line2 || "").trim(),
        city: currentCity || String(address.city || "").trim(),
        state: sudanState || String(address.state || "").trim(),
        country: currentCountry || String(address.country || "").trim(),
        postalCode: String(address.postalCode || "").trim(),
      },
    });

    const emailSent = await sendVerificationEmail({
      email: user.email,
      firstName: user.firstName,
      token: verification.token,
    });

    return res.status(201).json({
      message: "Account created. Please verify your email address",
      requiresEmailVerification: true,
      emailSent,
      data: { username: user.username, email: user.email },
    });
  } catch (error) {
    if (error.message?.includes("Required personal information is missing")) {
      return res.status(400).json({ message: error.message });
    }

    if (error.code === 11000) {
      return error.keyPattern?.email
        ? res.status(409).json({
            code: "EMAIL_IN_USE",
            message: "This email address is already registered",
          })
        : res.status(409).json({ message: "Username already exists" });
    }

    return next(error);
  }
}

export async function loginClientUser(req, res, next) {
  if (!ensureDatabaseConnected(res)) {
    return;
  }

  try {
    const username = String(req.body?.username || "")
      .trim()
      .toLowerCase();
    const password = String(req.body?.password || "");

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required" });
    }

    const user = await User.findOne({ username, role: "user" });
    if (!user) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    if (user.emailVerified === false) {
      return res.status(403).json({
        code: "EMAIL_NOT_VERIFIED",
        message: "Please verify your email address before signing in",
      });
    }

    const fullName = [
      user.firstName,
      user.fatherName || user.middleName,
      user.lastName,
    ]
      .filter(Boolean)
      .join(" ");

    return res.json({
      message: "Login successful",
      data: {
        _id: user._id,
        username: user.username,
        role: user.role,
        firstName: user.firstName,
        fatherName: user.fatherName,
        middleName: user.middleName,
        lastName: user.lastName,
        nationalId: user.nationalId,
        dateOfBirth: user.dateOfBirth,
        phoneCountryCode: user.phoneCountryCode,
        phoneNumber: user.phoneNumber,
        fullName,
        phone: user.phone,
        email: user.email,
        poBoxPrimary: user.poBoxPrimary,
        poBoxSecondary: user.poBoxSecondary,
        currentCountry: user.currentCountry,
        currentCity: user.currentCity,
        currentAddressLine: user.currentAddressLine,
        currentPhone: user.currentPhone,
        sudanState: user.sudanState,
        locality: user.locality,
        neighborhood: user.neighborhood,
        sudanPhone: user.sudanPhone,
        address: user.address,
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateClientProfile(req, res, next) {
  if (!ensureDatabaseConnected(res)) {
    return;
  }

  try {
    const username = String(req.body?.username || "")
      .trim()
      .toLowerCase();
    if (!username) {
      return res.status(400).json({ message: "Username is required" });
    }

    const user = await User.findOne({ username, role: "user" });
    if (!user) {
      return res.status(404).json({ message: "Client account not found" });
    }

    const nextFirstName = String(
      req.body?.firstName ?? user.firstName ?? "",
    ).trim();
    const nextMiddleName = String(
      req.body?.middleName ?? user.middleName ?? "",
    ).trim();
    const nextFatherName = String(
      req.body?.fatherName ?? user.fatherName ?? nextMiddleName ?? "",
    ).trim();
    const nextLastName = String(
      req.body?.lastName ?? user.lastName ?? "",
    ).trim();
    const nextNationalId = String(
      req.body?.nationalId ?? user.nationalId ?? "",
    ).trim();
    const nextDateOfBirth = String(
      req.body?.dateOfBirth ?? user.dateOfBirth ?? "",
    ).trim();
    const nextPhoneCountryCode = String(
      req.body?.phoneCountryCode ?? user.phoneCountryCode ?? "",
    ).trim();
    const nextPhoneNumber = String(
      req.body?.phoneNumber ?? user.phoneNumber ?? "",
    ).trim();
    const nextPhone =
      String(req.body?.phone ?? user.phone ?? "").trim() ||
      [nextPhoneCountryCode, nextPhoneNumber].filter(Boolean).join(" ").trim();
    const nextEmail = String(req.body?.email ?? user.email ?? "")
      .trim()
      .toLowerCase();
    const nextAddress = req.body?.address || user.address || {};
    const nextPoBoxPrimary = String(
      req.body?.poBoxPrimary ?? user.poBoxPrimary ?? nextAddress.line2 ?? "",
    ).trim();
    const nextPoBoxSecondary = String(
      req.body?.poBoxSecondary ?? user.poBoxSecondary ?? "",
    ).trim();
    const nextCurrentCountry = String(
      req.body?.currentCountry ??
        user.currentCountry ??
        nextAddress.country ??
        "",
    ).trim();
    const nextCurrentCity = String(
      req.body?.currentCity ?? user.currentCity ?? nextAddress.city ?? "",
    ).trim();
    const nextCurrentAddressLine = String(
      req.body?.currentAddressLine ??
        user.currentAddressLine ??
        nextAddress.line1 ??
        "",
    ).trim();
    const nextCurrentPhone = String(
      req.body?.currentPhone ?? user.currentPhone ?? "",
    ).trim();
    const nextSudanState = String(
      req.body?.sudanState ?? user.sudanState ?? nextAddress.state ?? "",
    ).trim();
    const nextLocality = String(
      req.body?.locality ?? user.locality ?? "",
    ).trim();
    const nextNeighborhood = String(
      req.body?.neighborhood ?? user.neighborhood ?? "",
    ).trim();
    const nextSudanPhone = String(
      req.body?.sudanPhone ?? user.sudanPhone ?? "",
    ).trim();

    if (!nextFirstName || !nextLastName || !nextPhone || !nextEmail) {
      return res.status(400).json({
        message: "First name, last name, phone, and email are required",
      });
    }

    if (
      !nextCurrentAddressLine ||
      !nextCurrentCity ||
      !nextSudanState ||
      !nextCurrentCountry
    ) {
      return res
        .status(400)
        .json({ message: "Complete address information is required" });
    }

    const emailChanged = nextEmail !== (user.email || "");
    if (emailChanged) {
      if (!/^\S+@\S+\.\S+$/.test(nextEmail)) {
        return res.status(400).json({ message: "A valid email is required" });
      }
      if (await User.exists({ email: nextEmail, _id: { $ne: user._id } })) {
        return res.status(409).json({
          code: "EMAIL_IN_USE",
          message: "This email address is already registered",
        });
      }
    }

    const updatePayload = {
      firstName: nextFirstName,
      fatherName: nextFatherName,
      middleName: nextFatherName || nextMiddleName,
      lastName: nextLastName,
      nationalId: nextNationalId,
      dateOfBirth: nextDateOfBirth,
      phoneCountryCode: nextPhoneCountryCode,
      phoneNumber: nextPhoneNumber,
      phone: nextPhone,
      email: nextEmail,
      poBoxPrimary: nextPoBoxPrimary,
      poBoxSecondary: nextPoBoxSecondary,
      currentCountry: nextCurrentCountry,
      currentCity: nextCurrentCity,
      currentAddressLine: nextCurrentAddressLine,
      currentPhone: nextCurrentPhone,
      sudanState: nextSudanState,
      locality: nextLocality,
      neighborhood: nextNeighborhood,
      sudanPhone: nextSudanPhone,
      address: {
        line1: nextCurrentAddressLine || String(nextAddress.line1 || "").trim(),
        line2: nextPoBoxPrimary || String(nextAddress.line2 || "").trim(),
        city: nextCurrentCity || String(nextAddress.city || "").trim(),
        state: nextSudanState || String(nextAddress.state || "").trim(),
        country: nextCurrentCountry || String(nextAddress.country || "").trim(),
        postalCode: String(nextAddress.postalCode || "").trim(),
      },
    };

    const password = String(req.body?.password || "");
    if (password) {
      if (password.length < 4) {
        return res
          .status(400)
          .json({ message: "Password must be at least 4 characters" });
      }
      updatePayload.passwordHash = await bcrypt.hash(password, 10);
    }

    let verification = null;
    if (emailChanged) {
      verification = createVerificationToken();
      updatePayload.emailVerified = false;
      updatePayload.emailVerificationTokenHash = verification.hash;
      updatePayload.emailVerificationExpires = verification.expires;
      updatePayload.emailVerificationSentAt = new Date();
    }

    const updatedUser = await User.findOneAndUpdate(
      { username, role: "user" },
      updatePayload,
      { new: true, runValidators: true },
    );

    if (verification) {
      await sendVerificationEmail({
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        token: verification.token,
      });
    }

    const fullName = [
      updatedUser.firstName,
      updatedUser.fatherName || updatedUser.middleName,
      updatedUser.lastName,
    ]
      .filter(Boolean)
      .join(" ");

    return res.json({
      message: "Profile updated successfully",
      data: {
        _id: updatedUser._id,
        username: updatedUser.username,
        role: updatedUser.role,
        firstName: updatedUser.firstName,
        fatherName: updatedUser.fatherName,
        middleName: updatedUser.middleName,
        lastName: updatedUser.lastName,
        nationalId: updatedUser.nationalId,
        dateOfBirth: updatedUser.dateOfBirth,
        phoneCountryCode: updatedUser.phoneCountryCode,
        phoneNumber: updatedUser.phoneNumber,
        fullName,
        phone: updatedUser.phone,
        email: updatedUser.email,
        poBoxPrimary: updatedUser.poBoxPrimary,
        poBoxSecondary: updatedUser.poBoxSecondary,
        currentCountry: updatedUser.currentCountry,
        currentCity: updatedUser.currentCity,
        currentAddressLine: updatedUser.currentAddressLine,
        currentPhone: updatedUser.currentPhone,
        sudanState: updatedUser.sudanState,
        locality: updatedUser.locality,
        neighborhood: updatedUser.neighborhood,
        sudanPhone: updatedUser.sudanPhone,
        address: updatedUser.address,
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function verifyClientEmail(req, res, next) {
  if (!ensureDatabaseConnected(res)) {
    return;
  }

  try {
    const token = String(req.body?.token || "").trim();
    if (!/^[a-f0-9]{64}$/.test(token)) {
      return res
        .status(400)
        .json({ message: "Invalid or expired verification link" });
    }

    const user = await User.findOneAndUpdate(
      {
        role: "user",
        emailVerificationTokenHash: hashToken(token),
        emailVerificationExpires: { $gt: new Date() },
      },
      {
        $set: { emailVerified: true },
        $unset: {
          emailVerificationTokenHash: "",
          emailVerificationExpires: "",
          emailVerificationSentAt: "",
        },
      },
    );

    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid or expired verification link" });
    }

    return res.json({
      message: "Email verified successfully. You can now sign in",
      data: { username: user.username },
    });
  } catch (error) {
    return next(error);
  }
}

export async function resendClientVerification(req, res, next) {
  if (!ensureDatabaseConnected(res)) {
    return;
  }

  // Same reply whether or not the account exists, to avoid revealing registered emails.
  const genericReply = {
    message:
      "If this account is awaiting verification, a new link has been sent to its email address",
  };

  try {
    const identifier = String(
      req.body?.username || req.body?.email || "",
    )
      .trim()
      .toLowerCase();
    if (!identifier) {
      return res
        .status(400)
        .json({ message: "Username or email is required" });
    }

    const user = await User.findOne({
      role: "user",
      emailVerified: false,
      $or: [{ username: identifier }, { email: identifier }],
    }).select("+emailVerificationSentAt");

    if (!user) {
      return res.json(genericReply);
    }

    const sentAt = user.emailVerificationSentAt?.getTime() || 0;
    if (Date.now() - sentAt < RESEND_COOLDOWN_MS) {
      return res.status(429).json({
        message: "Please wait a minute before requesting another email",
      });
    }

    const verification = createVerificationToken();
    user.emailVerificationTokenHash = verification.hash;
    user.emailVerificationExpires = verification.expires;
    user.emailVerificationSentAt = new Date();
    await user.save();

    await sendVerificationEmail({
      email: user.email,
      firstName: user.firstName,
      token: verification.token,
    });

    return res.json(genericReply);
  } catch (error) {
    return next(error);
  }
}
