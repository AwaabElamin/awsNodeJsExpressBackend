const assert = require("node:assert/strict");
const { test } = require("node:test");

let identity;
let awaabAccount;
let propertyAccount;
let lookedUpPropertyEmail;
let enabledPlatform;
let provisionedOwner;

function mockModule(name, exports) {
  const filename = require.resolve(name);
  require.cache[filename] = { id: filename, filename, loaded: true, exports };
}

mockModule("../jwt/jwtManager", class {
  verify() {
    return identity;
  }
});
mockModule("../models/users", {
  findByEmail: async (email) => {
    assert.equal(email, email.trim().toLowerCase());
    return awaabAccount;
  },
  enablePlatform: async (email, platformId) => {
    enabledPlatform = { email, platformId };
    return awaabAccount;
  }
});
mockModule("../propertyManagement/models/User", {
  findById: async () => propertyAccount,
  findOne: async (query) => {
    lookedUpPropertyEmail = query.email;
    if (query.status !== undefined) assert.equal(query.status, "active");
    return propertyAccount &&
      propertyAccount.email === query.email &&
      (query.status === undefined || propertyAccount.status === query.status)
      ? propertyAccount
      : null;
  },
  provisionOwnerForAwaabAccount: async (account, email) => {
    provisionedOwner = {
      _id: "new-owner-id",
      name: [account.firstname, account.lastname].filter(Boolean).join(" ") || email,
      email,
      role: "owner",
      status: "active",
      phone: account.phone
    };
    return provisionedOwner;
  }
});

const auth = require("../propertyManagement/middleware/auth");
const authRouter = require("../propertyManagement/routes/auth");
const meRoute = authRouter.stack.find((layer) => layer.route && layer.route.path === "/me");
const provisionRoute = authRouter.stack.find(
  (layer) => layer.route && layer.route.path === "/provision"
);

function response() {
  return {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}

async function authorize(identityValue) {
  identity = identityValue;
  const req = { headers: { authorization: "Bearer test-token" } };
  const res = response();
  let nextCalled = false;
  await auth(req, res, () => {
    nextCalled = true;
  });
  return { req, res, nextCalled };
}

async function provision(identityValue) {
  identity = identityValue;
  enabledPlatform = undefined;
  provisionedOwner = undefined;
  const req = { headers: { authorization: "Bearer test-token" } };
  const res = response();
  const [guard, handler] = provisionRoute.route.stack.map((layer) => layer.handle);
  let guardPassed = false;
  await guard(req, res, () => {
    guardPassed = true;
  });
  if (guardPassed) {
    await handler(req, res, (error) => {
      throw error;
    });
  }
  return { req, res, guardPassed };
}

test("Awaaab Clients use their active same-email Property Management account", async () => {
  awaabAccount = {
    _id: "awaab-client-id",
    email: "client@example.invalid",
    role: "Client",
    isActive: true,
    emailVerified: true
  };
  propertyAccount = {
    _id: "property-owner-id",
    email: "client@example.invalid",
    role: "owner",
    status: "active"
  };

  const { req, nextCalled } = await authorize({ email: " Client@Example.Invalid " });

  assert.equal(nextCalled, true);
  assert.equal(lookedUpPropertyEmail, "client@example.invalid");
  assert.equal(req.companyClient, true);
  assert.equal(req.userData.userId, "property-owner-id");
  assert.equal(req.userData.role, "owner");
  assert.equal(req.propertyUser, propertyAccount);
});

test("Visitors cannot use a matching Property Management account", async () => {
  awaabAccount = { email: "visitor@example.invalid", role: "Visitors", isActive: true };
  propertyAccount = { email: "visitor@example.invalid", role: "owner", status: "active" };
  lookedUpPropertyEmail = undefined;

  const { res, nextCalled } = await authorize({ email: "visitor@example.invalid" });

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error, "Property-management access required");
  assert.equal(nextCalled, false);
  assert.equal(lookedUpPropertyEmail, undefined);
});

test("inactive or unverified Awaaab Clients cannot use Property Management", async () => {
  for (const accountPatch of [{ isActive: false }, { emailVerified: false }]) {
    awaabAccount = {
      email: "client@example.invalid",
      role: "Client",
      isActive: true,
      emailVerified: true,
      ...accountPatch
    };
    propertyAccount = { email: "client@example.invalid", role: "owner", status: "active" };

    const { res, nextCalled } = await authorize({ email: "client@example.invalid" });

    assert.equal(res.statusCode, 403);
    assert.equal(nextCalled, false);
  }
});

test("Clients without an active matching Property Management account are denied", async () => {
  awaabAccount = {
    email: "client@example.invalid",
    role: "Client",
    isActive: true,
    emailVerified: true
  };
  propertyAccount = { email: "client@example.invalid", role: "owner", status: "inactive" };

  const { res, nextCalled } = await authorize({ email: "client@example.invalid" });

  assert.equal(res.statusCode, 403);
  assert.equal(nextCalled, false);
});

test("existing property-user tokens keep their role-based access", async () => {
  awaabAccount = null;
  propertyAccount = {
    _id: "property-owner-id",
    email: "client@example.invalid",
    role: "owner",
    status: "active"
  };

  const { req, nextCalled } = await authorize({
    userId: "property-owner-id",
    role: "owner",
    email: "client@example.invalid"
  });

  assert.equal(nextCalled, true);
  assert.equal(req.companyClient, undefined);
  assert.equal(req.userData.role, "owner");
  assert.equal(req.propertyUser, propertyAccount);
});

test("existing Awaaab Admin access remains available", async () => {
  awaabAccount = { _id: "admin-id", email: "admin@example.invalid", role: "Admin" };
  propertyAccount = null;

  const { req, nextCalled } = await authorize({ email: "admin@example.invalid" });

  assert.equal(nextCalled, true);
  assert.equal(req.companyAdmin, true);
  assert.equal(req.userData.role, "admin");
});

test("the Property Management profile endpoint returns the linked client profile", async () => {
  awaabAccount = {
    email: "client@example.invalid",
    role: "Client",
    isActive: true,
    emailVerified: true
  };
  propertyAccount = {
    _id: "property-owner-id",
    email: "client@example.invalid",
    name: "Client Owner",
    role: "owner",
    status: "active",
    phone: "555-0100",
    bank_name: "Example Bank",
    account_number: "account-1",
    iban: "iban-1"
  };
  const { req, res, nextCalled } = await authorize({ email: "client@example.invalid" });

  assert.equal(nextCalled, true);
  await meRoute.route.stack[1].handle(req, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    user: {
      id: "property-owner-id",
      name: "Client Owner",
      email: "client@example.invalid",
      role: "owner",
      status: "active",
      phone: "555-0100",
      bankName: "Example Bank",
      accountNumber: "account-1",
      iban: "iban-1"
    }
  });
});

test("a Client creating their first Property Management office becomes an owner", async () => {
  awaabAccount = {
    _id: "awaab-client-id",
    email: "client@example.invalid",
    firstname: "Client",
    lastname: "Owner",
    phone: "555-0100",
    role: "Client",
    isActive: true,
    emailVerified: true
  };
  propertyAccount = null;

  const { res, guardPassed } = await provision({ email: " Client@Example.Invalid " });

  assert.equal(guardPassed, true);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.user.id, "new-owner-id");
  assert.equal(res.body.user.email, "client@example.invalid");
  assert.equal(res.body.user.name, "Client Owner");
  assert.equal(res.body.user.role, "owner");
  assert.equal(res.body.user.status, "active");
  assert.deepEqual(enabledPlatform, {
    email: "client@example.invalid",
    platformId: "property-management"
  });
});

test("provisioning returns the existing active Property Management profile unchanged", async () => {
  awaabAccount = {
    email: "client@example.invalid",
    role: "Client",
    isActive: true,
    emailVerified: true
  };
  propertyAccount = {
    _id: "property-tenant-id",
    email: "client@example.invalid",
    name: "Existing Tenant",
    role: "tenant",
    status: "active"
  };

  const { res } = await provision({ email: "client@example.invalid" });

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.user.id, "property-tenant-id");
  assert.equal(res.body.user.role, "tenant");
  assert.equal(provisionedOwner, undefined);
  assert.equal(enabledPlatform.platformId, "property-management");
});

test("provisioning refuses an inactive Property Management profile", async () => {
  awaabAccount = {
    email: "client@example.invalid",
    role: "Client",
    isActive: true,
    emailVerified: true
  };
  propertyAccount = { email: "client@example.invalid", role: "owner", status: "inactive" };

  const { res } = await provision({ email: "client@example.invalid" });

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error, "Property account is inactive");
  assert.equal(provisionedOwner, undefined);
  assert.equal(enabledPlatform, undefined);
});

test("Visitors, unverified Clients, and property-user tokens cannot provision an office", async () => {
  propertyAccount = null;

  awaabAccount = { email: "visitor@example.invalid", role: "Visitors", isActive: true };
  let result = await provision({ email: "visitor@example.invalid" });
  assert.equal(result.res.statusCode, 403);
  assert.equal(result.guardPassed, false);

  awaabAccount = { email: "client@example.invalid", role: "Client", emailVerified: false };
  result = await provision({ email: "client@example.invalid" });
  assert.equal(result.res.statusCode, 403);
  assert.equal(result.guardPassed, false);

  awaabAccount = { email: "client@example.invalid", role: "Client", emailVerified: true };
  result = await provision({ userId: "property-owner-id", role: "owner", email: "client@example.invalid" });
  assert.equal(result.res.statusCode, 403);
  assert.equal(result.guardPassed, false);

  result = await provision(null);
  assert.equal(result.res.statusCode, 401);
  assert.equal(provisionedOwner, undefined);
});
