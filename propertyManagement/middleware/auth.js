const awaabUsers = require("../../models/users");
const PropertyUser = require("../models/User");
const {
  readBearerIdentity,
  normalizeEmail,
  isAwaabAdmin,
  isEligibleAwaabClient,
} = require("./awaabIdentity");

module.exports = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const identity = readBearerIdentity(req);
  if (!identity) {
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
      const email = normalizeEmail(identity.email);
      const user = await awaabUsers.findByEmail(email);
      if (isAwaabAdmin(user)) {
        req.userData = { userId: String(user._id), role: "admin" };
        req.companyAdmin = true;
        return next();
      }

      if (isEligibleAwaabClient(user)) {
        const propertyUser = await PropertyUser.findOne({ email, status: "active" });
        if (propertyUser) {
          req.userData = {
            userId: String(propertyUser._id),
            role: propertyUser.role,
          };
          req.propertyUser = propertyUser;
          req.companyClient = true;
          return next();
        }
      }
    }

    return res.status(403).json({ error: "Property-management access required" });
  } catch (error) {
    return next(error);
  }
};
