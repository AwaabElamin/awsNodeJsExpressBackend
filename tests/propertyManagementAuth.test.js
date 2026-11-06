const assert = require("node:assert/strict");
const { test } = require("node:test");

let identity;
let awaabAccount;
let propertyAccount;
let lookedUpPropertyEmail;

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
  }
});
mockModule("../propertyManagement/models/User", {
  findById: async () => propertyAccount,
  findOne: async (query) => {
    lookedUpPropertyEmail = query.email;
    assert.equal(query.status, "active");
    return propertyAccount &&
      propertyAccount.email === query.email &&
      propertyAccount.status === query.status
      ? propertyAccount
      : null;
  }
});

const auth = require("../propertyManagement/middleware/auth");
const authRouter = require("../propertyManagement/routes/auth");
const meRoute = authRouter.stack.find((layer) => layer.route && layer.route.path === "/me");

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
