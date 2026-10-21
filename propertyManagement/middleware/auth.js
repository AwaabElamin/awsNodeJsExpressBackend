const JwtManager = require("../../jwt/jwtManager");
const awaabUsers = require("../../models/users");
const PropertyUser = require("../models/User");

module.exports = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const token = header.slice("Bearer ".length);
  const identity = new JwtManager().verify(token);
  if (!identity || identity.autoHub === true) {
    return res.status(401).json({ error: "Invalid session" });
  }

  try {
    if (identity.userId) {
      const user = await PropertyUser.findById(identity.userId);
      if (!user || user.status !== "active" || user.role !== identity.role) {
        return res.status(401).json({ error: "Property account is inactive" });
      }

      req.userData = {
        userId: String(user._id),
        role: user.role,
      };
      req.propertyUser = user;
      return next();
    }

    if (identity.email) {
      const user = await awaabUsers.findByEmail(identity.email);
      if (user && String(user.role || "").trim().toLowerCase() === "admin") {
        req.userData = { userId: String(user._id), role: "admin" };
        req.companyAdmin = true;
        return next();
      }
    }

    return res.status(403).json({ error: "Property-management access required" });
  } catch (error) {
    return next(error);
  }
};
