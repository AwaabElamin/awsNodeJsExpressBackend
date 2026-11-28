const express = require('express');

function startBuildSudanConnection(connect, uri, dbName, { schedule = setTimeout } = {}) {
  function attempt() {
    Promise.resolve().then(() => connect(uri, dbName)).catch(() => {
      // Avoid logging driver errors, which may contain connection details.
      console.error('BuildSudan database connection failed; retrying in 30 seconds');
      const timer = schedule(attempt, 30000);
      if (timer && typeof timer.unref === 'function') timer.unref();
    });
  }
  attempt();
}

function configError(env) {
  if (env.BUILDSUDAN_ENABLED !== 'true') return 'BuildSudan integration is disabled';
  if (!env.BUILDSUDAN_MONGODB_URI || !env.BUILDSUDAN_DB_NAME || !env.BUILDSUDAN_ADMIN_JWT_SECRET) {
    return 'BuildSudan requires BUILDSUDAN_MONGODB_URI, BUILDSUDAN_DB_NAME and BUILDSUDAN_ADMIN_JWT_SECRET';
  }
  if (!/^mongodb(?:\+srv)?:\/\/\S+$/i.test(env.BUILDSUDAN_MONGODB_URI)) {
    return 'Invalid BUILDSUDAN_MONGODB_URI';
  }
  const name = env.BUILDSUDAN_DB_NAME;
  if (!/^[^/\\ ."$*<>:|?]+$/.test(name)) return 'Invalid BUILDSUDAN_DB_NAME';
  const usersUri = env.MONGODB_URI_USERS || env.MONGODB_URI || '';
  const usersDb = /^mongodb(?:\+srv)?:\/\/[^/]+\/([^?/]*)/i.exec(usersUri);
  const reserved = [
    'admin', 'config', 'local', 'test',
    usersDb && decodeURIComponent(usersDb[1]),
    env.MONGODB_DB_RESUME || 'resume',
    env.MONGODB_DB_CARSHOP || 'CarShop',
    env.MONGODB_DB_DELIVERY || 'Delivery',
    env.MONGODB_DB_GROCERIES || 'Groceries',
    env.MONGODB_DB_PROPERTY_MANAGEMENT || 'PropertyManagement',
  ].filter(Boolean).map(value => value.toLowerCase());
  if (reserved.includes(name.toLowerCase())) return 'BUILDSUDAN_DB_NAME must differ from Awaaab databases';
  if (env.JWT_SECRET && env.JWT_SECRET === env.BUILDSUDAN_ADMIN_JWT_SECRET) {
    return 'BuildSudan must use a separate JWT secret';
  }
  return null;
}

async function createBuildSudanRouter(env = process.env) {
  const unavailable = express.Router();
  try {
    const error = configError(env);
    if (error) {
      unavailable.use((req, res) => res.status(503).json({ message: error }));
      return unavailable;
    }
    const integration = await import('../buildSudan/router.js');
    const router = integration.createRouter(env);
    startBuildSudanConnection(integration.connect, env.BUILDSUDAN_MONGODB_URI, env.BUILDSUDAN_DB_NAME);
    return router;
  } catch (error) {
    console.error('BuildSudan setup failed; check the dedicated configuration');
    unavailable.use((req, res) => res.status(503).json({ message: 'BuildSudan setup failed' }));
    return unavailable;
  }
}

module.exports = { createBuildSudanRouter, configError, startBuildSudanConnection };
