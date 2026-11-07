const awaabUsers = require("../../models/users");
const {
  readBearerIdentity,
  normalizeEmail,
  isEligibleAwaabClient,
} = require("./awaabIdentity");

// Admits a verified, active Awaaab Client even when no Property Management
// profile exists yet. Used only to provision that profile.
module.exports = async (req, res, next) => {
  const identity = readBearerIdentity(req);
  if (!identity) {
    return res.status(401).json({ error: "Authentication required" });
  }
  if (!identity.email || identity.userId) {
    return res.status(403).json({ error: "An Awaaab account is required" });
  }

  try {
    const email = normalizeEmail(identity.email);
    const account = await awaabUsers.findByEmail(email);
    if (!account) {
      return res.status(403).json({ error: "An Awaaab account is required" });
    }
    if (account.role === "Visitors") {
      return res.status(403).json({ error: "Create your workspace to become a Client first" });
    }
    if (!isEligibleAwaabClient(account)) {
      return res.status(403).json({ error: "A verified, active Awaaab Client account is required" });
    }

    req.awaabAccount = account;
    req.awaabEmail = email;
    return next();
  } catch (error) {
    return next(error);
  }
};
