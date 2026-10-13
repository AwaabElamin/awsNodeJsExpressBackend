require('dotenv').config();
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');

async function setupAdmin() {
    const uri = process.env.MONGODB_URI_USERS || process.env.MONGODB_URI;
    const password = process.env.ADMIN_PASSWORD;
    if (!uri || !password) {
        throw new Error('Set MONGODB_URI_USERS (or MONGODB_URI) and ADMIN_PASSWORD before running setup:admin');
    }
    if (password.length < 8) {
        throw new Error('ADMIN_PASSWORD must be at least 8 characters');
    }

    await mongoose.connect(uri);
    const users = mongoose.connection.collection('users');
    const passwordHash = bcrypt.hashSync(password, 12);
    const existingAdmin = await users.findOne({ username: 'admin' });
    const legacyAdmin = existingAdmin || await users.findOne({ role: 'Admin' });
    const adminId = legacyAdmin?._id || new mongoose.Types.ObjectId();

    if (legacyAdmin) {
        await users.updateOne(
            { _id: adminId },
            { $set: { username: 'admin', password: passwordHash, role: 'Admin', emailVerified: true } },
        );
    } else {
        await users.insertOne({
            _id: adminId,
            username: 'admin',
            email: 'admin@local.invalid',
            password: passwordHash,
            role: 'Admin',
            emailVerified: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    }

    await users.updateMany(
        { _id: { $ne: adminId } },
        { $set: { role: 'Client' } },
    );

    console.log('Admin account configured; all other accounts are non-Admin.');
    await mongoose.disconnect();
}

setupAdmin().catch(async (error) => {
    console.error('Admin setup failed. Check the required environment settings and database connectivity.');
    await mongoose.disconnect().catch(() => {});
    process.exitCode = 1;
});