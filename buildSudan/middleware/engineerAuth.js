import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

export async function requireEngineerAuth(req, res, next) {
  const jwtSecret = process.env.BUILDSUDAN_ADMIN_JWT_SECRET;

  if (!jwtSecret) {
    return res
      .status(500)
      .json({ message: "Engineer access is not configured on the server" });
  }

  if (User.db.readyState !== 1) {
    return res.status(503).json({ message: "Database is not connected" });
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";
  if (!token) {
    return res.status(401).json({ message: "Unauthorized engineer access" });
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    if (payload.role !== "engineer" || !payload.sub) {
      return res.status(403).json({ message: "Engineer role is required" });
    }

    const user = await User.findById(payload.sub).select(
      "username role firstName middleName lastName nationalId",
    );
    const normalizedRole = String(user?.role || "")
      .trim()
      .toLowerCase();
    if (!user || !["engineer", "eng"].includes(normalizedRole)) {
      return res
        .status(403)
        .json({ message: "Engineer account is no longer active" });
    }

    req.engineer = {
      userId: user._id,
      username: user.username,
      fullName:
        [user.firstName, user.middleName, user.lastName]
          .filter(Boolean)
          .join(" ") || user.username,
      registrationNumber: user.nationalId || user._id.toString(),
      role: "engineer",
    };
    return next();
  } catch {
    return res.status(401).json({ message: "Unauthorized engineer access" });
  }
}
