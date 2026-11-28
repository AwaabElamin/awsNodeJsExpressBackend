const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { configError, createBuildSudanRouter, startBuildSudanConnection } = require('../lib/buildSudan');

const config = {
  BUILDSUDAN_ENABLED: 'true',
  BUILDSUDAN_MONGODB_URI: 'mongodb://localhost:27017/ignored',
  BUILDSUDAN_DB_NAME: 'buildsudan',
  BUILDSUDAN_ADMIN_JWT_SECRET: 'separate-test-secret',
  BUILDSUDAN_FRONTEND_URL: ' https://example.test , https://second.example.test ',
  MONGODB_URI_USERS: 'mongodb://localhost:27017/users',
  JWT_SECRET: 'host-test-secret'
};

async function serve(router, fn) {
  const app = express();
  app.use('/buildsudan/api', router);
  app.use(express.json());
  app.post('/host', (req, res) => res.json(req.body));
  const server = await new Promise(resolve => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  try {
    await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

async function serveApp(app, fn) {
  const server = await new Promise(resolve => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  try {
    await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

test('BuildSudan integration without live database or SMTP', async t => {
  const envNames = [
    'BUILDSUDAN_ADMIN_JWT_SECRET',
    'BUILDSUDAN_SMTP_USER',
    'BUILDSUDAN_SMTP_PASS',
    'BUILDSUDAN_CONTACT_RECEIVER_EMAIL',
    'BUILDSUDAN_FRONTEND_URL',
    'JWT_SECRET'
  ];
  const originalEnv = Object.fromEntries(envNames.map(name => [name, process.env[name]]));
  t.after(() => {
    for (const name of envNames) {
      if (originalEnv[name] === undefined) delete process.env[name];
      else process.env[name] = originalEnv[name];
    }
  });

  assert.match(configError({}), /disabled/);
  assert.match(configError({ BUILDSUDAN_ENABLED: 'true' }), /requires/);
  assert.match(configError({ ...config, BUILDSUDAN_DB_NAME: 'users' }), /differ/);
  assert.match(configError({ ...config, BUILDSUDAN_DB_NAME: 'CarShop' }), /differ/);
  assert.match(configError({ ...config, BUILDSUDAN_ADMIN_JWT_SECRET: config.JWT_SECRET }), /separate/);
  assert.match(configError({ ...config, BUILDSUDAN_MONGODB_URI: 'invalid' }), /Invalid/);
  assert.equal(configError(config), null);

  await serve(await createBuildSudanRouter({}), async base => {
    const disabled = await fetch(`${base}/buildsudan/api/health`);
    assert.equal(disabled.status, 503);
    assert.match((await disabled.json()).message, /disabled/);
    const host = await fetch(`${base}/host`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"ok":true}'
    });
    await serve(await createBuildSudanRouter({ BUILDSUDAN_ENABLED: 'true' }), async base => {
      const response = await fetch(`${base}/buildsudan/api/health`);
      assert.equal(response.status, 503);
      assert.match((await response.json()).message, /requires/);
    });
    assert.deepEqual(await host.json(), { ok: true });
  });

  const { default: nodemailer } = await import('nodemailer');
  const originalTransport = nodemailer.createTransport;
  const sent = [];
  nodemailer.createTransport = options => ({
    sendMail: async mail => { sent.push({ options, mail }); }
  });
  t.after(() => { nodemailer.createTransport = originalTransport; });
  const { connection } = await import('../buildSudan/connection.js');
  const { User } = await import('../buildSudan/models/User.js');
  const { Role } = await import('../buildSudan/models/Role.js');
  const { Setting } = await import('../buildSudan/models/Setting.js');
  const { Application } = await import('../buildSudan/models/Application.js');
  assert.notEqual(connection, mongoose.connection);
  for (const model of [User, Role, Setting, Application]) assert.equal(model.db, connection);
  assert.notEqual(mongoose.models.User, User);
  const verification = new User({
    username: 'test', passwordHash: 'hash', emailVerified: false,
    emailVerificationTokenHash: 'hash', emailVerificationExpires: new Date(),
    emailVerificationSentAt: new Date()
  }).toObject();
  assert.equal(verification.emailVerified, false);
  assert.equal(verification.emailVerificationTokenHash, 'hash');

  process.env.BUILDSUDAN_ADMIN_JWT_SECRET = config.BUILDSUDAN_ADMIN_JWT_SECRET;
  process.env.BUILDSUDAN_SMTP_USER = 'sender@example.test';
  process.env.BUILDSUDAN_SMTP_PASS = 'test-password';
  process.env.BUILDSUDAN_CONTACT_RECEIVER_EMAIL = 'receiver@example.test';
  process.env.BUILDSUDAN_FRONTEND_URL = ' https://example.test/ , https://second.example.test ';
  process.env.JWT_SECRET = config.JWT_SECRET;

  const originalOpen = connection.openUri;
  t.after(() => { connection.openUri = originalOpen; });
  let connectionOptions;
  connection.openUri = async (uri, options) => { connectionOptions = { uri, options }; };
  const DB = require('../lib/db');
  const originalGetModel = DB.getModel;
  let app;
  try {
    // Let the real host app load its normal route tree with in-memory Mongoose models.
    DB.getModel = (connectionName, modelName, schema) =>
      mongoose.models[modelName] || mongoose.model(modelName, schema);
    app = await require('../app').createApp({ buildSudanEnv: config });
  } finally {
    DB.getModel = originalGetModel;
  }
  assert.equal(connectionOptions.uri, config.BUILDSUDAN_MONGODB_URI);
  assert.deepEqual(connectionOptions.options, { dbName: 'buildsudan', autoIndex: false, autoCreate: false });

  await serveApp(app, async base => {
    const api = `${base}/buildsudan/api`;
    const post = (path, body, extraHeaders = {}) => fetch(api + path, {
      method: 'POST', headers: { 'content-type': 'application/json', ...extraHeaders },
      body: typeof body === 'string' ? body : JSON.stringify(body)
    });

    assert.deepEqual(await (await fetch(`${base}/health`)).json(), {
      status: 'ok', service: 'awsNodeJsExpressBackend'
    });
    const hostLogin = await fetch(`${base}/login`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}'
    });
    assert.equal(hostLogin.status, 400);
    assert.equal((await fetch(`${base}/users`)).status, 401);
    assert.equal((await fetch(`${api}/health`)).status, 200);
    assert.equal((await fetch(`${api}/applications`)).status, 503);

    assert.notEqual(User.db, mongoose.connection);
    assert.equal(mongoose.models.User.db, mongoose.connection);
    assert.notEqual(User.db, mongoose.models.User.db);
    for (const model of [User, Role, Setting, Application]) assert.equal(model.db, connection);

    const adminRoles = `${api}/admin/roles`;
    const hostUsers = `${base}/users`;
    const adminRoute = await fetch(adminRoles, { headers: { authorization: 'Bearer test' } });
    assert.equal(adminRoute.status, 401);
    const disabledContact = await post('/contact', '{}');
    assert.equal(disabledContact.status, 400);
    assert.equal((await post('/contact', '{')).status, 400);
    assert.equal((await post('/contact', JSON.stringify({ message: 'x'.repeat(101 * 1024) }))).status, 400);
    assert.equal((await post('/contact', JSON.stringify({ message: 'x'.repeat(10 * 1024 * 1024) }))).status, 413);
    const preflight = await fetch(`${api}/contact`, {
      method: 'OPTIONS', headers: { origin: 'https://example.test', 'access-control-request-method': 'POST' }
    });
    assert.equal(preflight.headers.get('access-control-allow-origin'), 'https://example.test');
    const secondOrigin = await fetch(`${api}/health`, { headers: { origin: 'https://second.example.test' } });
    assert.equal(secondOrigin.headers.get('access-control-allow-origin'), 'https://second.example.test');
    assert.equal((await fetch(`${api}/health`, { headers: { origin: 'https://blocked.test' } })).status, 500);
    const unknown = await fetch(`${api}/missing`, { headers: { origin: 'https://example.test' } });
    assert.equal(unknown.status, 404);
    assert.equal(unknown.headers.get('access-control-allow-origin'), 'https://example.test');
    assert.deepEqual(await unknown.json(), { message: 'Not found' });
    const unknownBlocked = await fetch(`${api}/missing`, { headers: { origin: 'https://blocked.test' } });
    assert.equal(unknownBlocked.headers.get('access-control-allow-origin'), null);
    assert.equal((await post('/contact', { name: 'A', email: 'a@example.test', subject: 'Hi', message: 'Hello' })).status, 200);
    assert.equal(sent[0].mail.to, 'receiver@example.test');
    assert.equal(sent[0].options.auth.user, 'sender@example.test');
    const { sendVerificationEmail } = await import('../buildSudan/utils/emailVerification.js');
    const { sendAssessmentAdminNotice } = await import('../buildSudan/utils/mailer.js');
    assert.equal(await sendVerificationEmail({ email: 'client@example.test', token: 'test-token' }), true);
    assert.match(sent[1].mail.text, /https:\/\/example\.test\/\?verify=test-token/);
    assert.doesNotMatch(sent[1].mail.text, /second\.example\.test/);
    assert.equal(await sendAssessmentAdminNotice({
      application: { _id: 'request-id' },
      assessment: { engineerName: 'Engineer', submittedAt: new Date('2026-01-01T00:00:00Z') }
    }), true);
    assert.match(sent[2].mail.text, /Admin panel: https:\/\/example\.test\//);
    assert.doesNotMatch(sent[2].mail.text, /second\.example\.test/);

    const originalReady = Object.getOwnPropertyDescriptor(connection, 'readyState');
    const originalFindOne = User.findOne;
    const originalFind = Role.find;
    const originalCreate = Application.create;
    Object.defineProperty(connection, 'readyState', { configurable: true, value: 1 });
    User.findOne = async () => ({ _id: '123', username: 'admin', role: 'admin', passwordHash: await bcrypt.hash('password', 4) });
    Role.find = () => ({ sort: async () => [] });
    try {
      const login = await post('/settings/admin/login', { username: 'admin', password: 'password' });
      assert.equal(login.status, 200);
      const { token } = await login.json();
      assert.equal(jwt.verify(token, config.BUILDSUDAN_ADMIN_JWT_SECRET).role, 'admin');
      assert.throws(() => jwt.verify(token, config.JWT_SECRET));
      assert.equal((await fetch(adminRoles, { headers: { authorization: `Bearer ${token}` } })).status, 200);
      assert.equal((await fetch(hostUsers, { headers: { authorization: `Bearer ${token}` } })).status, 401);
      assert.equal((await fetch(`${api}/settings/public/paypal-donation-url`)).status, 404);
      assert.equal((await fetch(`${api}/applications/donations?username=test`)).status, 404);
      assert.equal((await fetch(`${api}/applications/admin/donations`, {
        headers: { authorization: `Bearer ${token}` }
      })).status, 404);

      const hostToken = jwt.sign({ role: 'admin' }, config.JWT_SECRET);
      assert.equal((await fetch(adminRoles, { headers: { authorization: `Bearer ${hostToken}` } })).status, 401);
      User.findOne = async () => ({ _id: '456', username: 'engineer', role: 'engineer', passwordHash: await bcrypt.hash('password', 4) });
      const engineer = await post('/settings/public/engineer/login', { username: 'engineer', password: 'password' });
      assert.equal(engineer.status, 200);
      assert.equal(jwt.verify((await engineer.json()).token, config.BUILDSUDAN_ADMIN_JWT_SECRET).role, 'engineer');
      User.findOne = async () => ({ _id: '789', username: 'client', role: 'user', emailVerified: false, passwordHash: await bcrypt.hash('password', 4) });
      const client = await post('/settings/public/login', { username: 'client', password: 'password' });
      assert.equal(client.status, 403);
      assert.equal((await client.json()).code, 'EMAIL_NOT_VERIFIED');
      Application.create = async () => { throw new mongoose.Error.ValidationError(); };
      assert.equal((await post('/requests', {})).status, 400);
    } finally {
      User.findOne = originalFindOne;
      Role.find = originalFind;
      Application.create = originalCreate;
      if (originalReady) Object.defineProperty(connection, 'readyState', originalReady);
      else delete connection.readyState;
    }
  });

  const { createApp } = require('../app');
  for (const buildSudanEnv of [{}, { BUILDSUDAN_ENABLED: 'true' }]) {
    await serveApp(await createApp({ buildSudanEnv }), async base => {
      assert.equal((await fetch(`${base}/health`)).status, 200);
      const unavailable = await fetch(`${base}/buildsudan/api/health`);
      assert.equal(unavailable.status, 503);
      assert.match((await unavailable.json()).message, buildSudanEnv.BUILDSUDAN_ENABLED ? /requires/ : /disabled/);
      assert.equal((await fetch(`${base}/users`)).status, 401);
    });
  }

  connection.openUri = originalOpen;
});

test('failed initial BuildSudan connection retries without overlap', async t => {
  const pending = [];
  const scheduled = [];
  const calls = [];
  const { connection } = await import('../buildSudan/connection.js');
  const { connect } = await import('../buildSudan/router.js');
  const originalOpen = connection.openUri;
  t.after(() => { connection.openUri = originalOpen; });
  connection.openUri = (uri, options) => {
    calls.push({ uri, options });
    return new Promise((resolve, reject) => pending.push({ resolve, reject }));
  };
  startBuildSudanConnection(connect, 'test-uri', 'test-db', {
    schedule: (callback, delay) => {
      scheduled.push({ callback, delay });
      return { unref() {} };
    }
  });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    uri: 'test-uri',
    options: { dbName: 'test-db', autoIndex: false, autoCreate: false }
  });
  assert.equal(scheduled.length, 0);
  pending[0].reject(new Error('synthetic connection failure'));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(scheduled.length, 1);
  assert.equal(scheduled[0].delay, 30000);
  scheduled[0].callback();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls.length, 2);
  assert.equal(scheduled.length, 1);
  pending[1].resolve();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(scheduled.length, 1);
});
