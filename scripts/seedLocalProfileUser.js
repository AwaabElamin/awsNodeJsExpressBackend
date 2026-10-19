const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const configureLocalEnvironment = require('./localEnv');

const { mongoUri } = configureLocalEnvironment();
const users = require('../models/users');

async function seedLocalProfileUser() {
    const email = String(process.env.LOCAL_TEST_EMAIL || '').trim().toLowerCase();
    const password = process.env.LOCAL_TEST_PASSWORD || '';
    if (!/^[^\s@]+@[^\s@]+\.invalid$/.test(email)) {
        throw new Error('Set LOCAL_TEST_EMAIL to an address ending in .invalid in the ignored .env.local file.');
    }
    if (password.length < 6 || password.length > 15) {
        throw new Error('Set LOCAL_TEST_PASSWORD to 6-15 characters in the ignored .env.local file.');
    }

    await mongoose.connect(mongoUri);
    try {
        let user = await users.findByEmail(email);
        if (!user) {
            user = new (mongoose.model('User'))({ email });
        }
        user.password = await bcrypt.hash(password, 10);
        user.firstname = 'Local';
        user.lastname = 'Profile Test';
        user.phone = '';
        user.emailVerified = true;
        user.role = 'Client';
        await user.save();
        console.log(`Local profile test account ready: ${email}`);
    } finally {
        await mongoose.disconnect();
    }
}

seedLocalProfileUser().catch((error) => {
    console.error(error.message || 'Could not seed the local profile test account.');
    process.exitCode = 1;
});
