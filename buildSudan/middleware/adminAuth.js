import jwt from "jsonwebtoken";

export function requireAdminAuth(req, res, next) {
  const jwtSecret = process.env.BUILDSUDAN_ADMIN_JWT_SECRET;

  if (!jwtSecret) {
    return res.status(500).json({ message: "Admin access is not configured on the server" });
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  if (!token) {
    return res.status(401).json({ message: "Unauthorized admin access" });
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    if (payload.role !== "admin") {
      return res.status(403).json({ message: "Admin role is required" });
    }

    req.admin = {
      userId: payload.sub,
      username: payload.username,
      role: payload.role
    };
    return next();
  } catch {
    return res.status(401).json({ message: "Unauthorized admin access" });
  }
}
