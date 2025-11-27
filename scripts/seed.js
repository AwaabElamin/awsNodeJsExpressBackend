/**
 * Simple seed script to create a test user in the `users` DB.
 * Usage: copy `.env.example` to `.env`, set `MONGODB_URI_USERS`, then run:
 * node scripts/seed.js
 */
require('dotenv').config();
const DB = require('../lib/db');
const bcrypt = require('bcrypt');

async function run() {
  const uri = process.env.MONGODB_URI_USERS || process.env.MONGODB_URI;
  if (!uri) {
    console.error('Set MONGODB_URI_USERS in environment or .env before running this script');
    process.exit(1);
  }

  try {
    // create a named users connection
    await DB.createConnection('users', uri);
    const userSchema = require('mongoose').Schema({
      email: { type: String, unique: true },
      password: { type: String },
      phone: { type: String },
      firstname: { type: String },
      lastname: { type: String }
    });
    const User = DB.getModel('users', 'users', userSchema);

    const email = process.env.SEED_USER_EMAIL || 'admin@example.com';
    const password = process.env.SEED_USER_PASSWORD || 'P@ssw0rd';

    const existing = await User.findOne({ email });
    if (existing) {
      console.log('Seed user already exists:', email);
      process.exit(0);
    }

    const hashed = bcrypt.hashSync(password, 8);
    const newUser = new User({ email, password: hashed, firstname: 'Admin', lastname: 'User' });
    await newUser.save();
    console.log('Created seed user:', email);
    await DB.disconnectAll();
    process.exit(0);
  } catch (err) {
    console.error('Seed failed', err);
    process.exit(1);
  }
}

run();
