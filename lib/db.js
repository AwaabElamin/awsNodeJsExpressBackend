const mongoose = require('mongoose');
const debug = require('debug')('app:db');

// Map for named connections created by mongoose.createConnection
const connections = new Map();

class DB {
  // Connect default mongoose (used by models that rely on default mongoose)
  static async connect(uri, opts = {}) {
    if (!uri) throw new Error('MONGODB_URI is required for default connection');
    mongoose.set('strictQuery', false);
    try {
      await mongoose.connect(uri, { 
        useNewUrlParser: true,
        useUnifiedTopology: true,
        ...opts
      });
      debug('Connected default mongoose');
    } catch (err) {
      debug('MongoDB default connection error', err);
      throw err;
    }
  }

  // Create a named connection (for separate DBs)
  static async createConnection(name, uri, opts = {}) {
    if (!name) throw new Error('Connection name is required');
    if (!uri) throw new Error('URI is required');
    if (connections.has(name)) return connections.get(name);
    try {
      const conn = await mongoose.createConnection(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        ...opts
      });
      connections.set(name, conn);
      debug(`Created connection ${name}`);
      return conn;
    } catch (err) {
      debug(`Error creating connection ${name}`, err);
      throw err;
    }
  }

  // Get a named connection
  static getConnection(name) {
    return connections.get(name) || null;
  }

  // Return a model from a named connection (or default mongoose if name is falsy)
  static getModel(connName, modelName, schema) {
    if (!connName) {
      // default mongoose
      return mongoose.models[modelName] || mongoose.model(modelName, schema);
    }
    const conn = connections.get(connName);
    if (!conn) throw new Error(`Connection '${connName}' not found`);
    return conn.models[modelName] || conn.model(modelName, schema);
  }

  // Disconnect default mongoose
  static async disconnect() {
    try {
      await mongoose.disconnect();
      debug('Disconnected default mongoose');
    } catch (err) {
      debug('Error disconnecting default mongoose', err);
    }
  }

  // Disconnect all named connections and default
  static async disconnectAll() {
    for (const [name, conn] of connections.entries()) {
      try {
        await conn.close();
        debug(`Closed connection ${name}`);
      } catch (err) {
        debug(`Error closing connection ${name}`, err);
      }
    }
    connections.clear();
    await DB.disconnect();
  }
}

module.exports = DB;
