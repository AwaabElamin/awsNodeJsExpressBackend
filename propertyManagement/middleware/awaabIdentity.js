const JwtManager = require("../../jwt/jwtManager");

// Reads the verified JWT payload from the Authorization header, or null when
// the header is missing, the token is invalid, or it belongs to AutoHub.
const readBearerIdentity = (req) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return null;
  }

  const identity = new JwtManager().verify(header.slice("Bearer ".length));
  if (!identity || identity.autoHub === true) {
    return null;
  }
  return identity;
};

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const isAwaabAdmin = (account) =>
  Boolean(account) && String(account.role || "").trim().toLowerCase() === "admin";

const isEligibleAwaabClient = (account) =>
  Boolean(account) &&
  account.role === "Client" &&
  account.isActive !== false &&
  account.emailVerified !== false;

module.exports = {
  readBearerIdentity,
  normalizeEmail,
  isAwaabAdmin,
  isEligibleAwaabClient,
};
