const bcrypt = require('bcrypt');
const crypto = require('crypto');
const usersModel = require('../models/users');
const { sendVerificationEmail } = require('../lib/mailer');

function validText(value, maxLength) {
    return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLength;
}

exports.listUsers = async (req, res, next) => {
    try {
        const users = await usersModel.listAllForAdmin();
        return res.json({ status: 'success', data: users });
    } catch (error) {
        return next(error);
    }
};

exports.createClient = async (req, res, next) => {
    const { email, firstname, lastname, phone, password } = req.body || {};
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
        !validText(firstname, 80) || !validText(lastname, 80) ||
        typeof password !== 'string' || password.length < 8 || password.length > 128 ||
        (phone !== undefined && typeof phone !== 'string')) {
        return res.status(400).json({ status: 'fail', message: 'Provide a valid email, first and last name, and a password of at least 8 characters.' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');
    const verificationTokenExpiresAt = new Date(Date.now() + Number(process.env.EMAIL_VERIFICATION_TTL_MINUTES || 30) * 60 * 1000);

    try {
        const user = await usersModel.create({
            email: normalizedEmail,
            password: bcrypt.hashSync(password, 12),
            firstname: firstname.trim(),
            lastname: lastname.trim(),
            phone: typeof phone === 'string' ? phone.trim() : '',
            role: 'Client',
            emailVerified: false,
            verificationTokenHash,
            verificationTokenExpiresAt
        });
        if (typeof user === 'string') {
            return res.status(409).json({ status: 'fail', message: 'An account with this email already exists.' });
        }

        const frontendUrl = String(process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
        const verificationUrl = `${frontendUrl}/login/verify?token=${verificationToken}`;
        try {
            await sendVerificationEmail({ email: normalizedEmail, firstName: firstname.trim(), verificationUrl });
        } catch (mailError) {
            await usersModel.findAndDelete(user._id);
            console.error('Admin-created client verification email failed', {
                code: mailError && mailError.code,
                responseCode: mailError && mailError.responseCode
            });
            return res.status(503).json({ status: 'error', message: 'The client account could not be created because the verification email could not be sent.' });
        }

        return res.status(201).json({ status: 'success', message: 'Client account created; verification email sent.' });
    } catch (error) {
        if (error && error.code === 11000) {
            return res.status(409).json({ status: 'fail', message: 'An account with this email already exists.' });
        }
        return next(error);
    }
};

exports.updateClient = async (req, res, next) => {
    const { firstname, lastname, phone } = req.body || {};
    const fields = {};
    if (firstname !== undefined) {
        if (!validText(firstname, 80)) return res.status(400).json({ status: 'fail', message: 'First name must be between 1 and 80 characters.' });
        fields.firstname = firstname.trim();
    }
    if (lastname !== undefined) {
        if (!validText(lastname, 80)) return res.status(400).json({ status: 'fail', message: 'Last name must be between 1 and 80 characters.' });
        fields.lastname = lastname.trim();
    }
    if (phone !== undefined) {
        if (typeof phone !== 'string' || phone.length > 40) return res.status(400).json({ status: 'fail', message: 'Phone number must be 40 characters or fewer.' });
        fields.phone = phone.trim();
    }
    if (!Object.keys(fields).length) {
        return res.status(400).json({ status: 'fail', message: 'Provide at least one profile field to update.' });
    }

    try {
        const client = await usersModel.updateClientForAdmin(req.params.id, fields);
        if (!client) return res.status(404).json({ status: 'fail', message: 'Client not found.' });
        return res.json({ status: 'success', data: client });
    } catch (error) {
        return next(error);
    }
};

exports.deleteClient = async (req, res, next) => {
    try {
        const deleted = await usersModel.deleteClientForAdmin(req.params.id);
        if (!deleted) return res.status(404).json({ status: 'fail', message: 'Client not found.' });
        return res.json({ status: 'success', message: 'Client deleted.' });
    } catch (error) {
        return next(error);
    }
};