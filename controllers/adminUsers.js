const bcrypt = require('bcrypt');
const crypto = require('crypto');
const mongoose = require('mongoose');
const usersModel = require('../models/users');
const usedCars = require('../models/autoUsedCar');
const groceryProducts = require('../models/groceryProduct');
const autoMessages = require('../models/autoMessage');
const groceryMessages = require('../models/groceryMessage');
const { sendVerificationEmail } = require('../lib/mailer');

const CONVERSATION_PLATFORMS = {
    auto: autoMessages,
    groceries: groceryMessages
};

function validText(value, maxLength) {
    return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLength;
}

function conversationSummary(platform, conversation, accountId) {
    const messages = Array.isArray(conversation.messages) ? conversation.messages : [];
    const last = messages[messages.length - 1];
    return {
        _id: conversation._id,
        platform,
        listingLabel: conversation.vehicleLabel,
        listingId: conversation.vehicleId || conversation.productId,
        accountSide: String(conversation.ownerId) === String(accountId) ? 'owner' : 'visitor',
        ownerId: conversation.ownerId,
        visitorId: conversation.visitorId,
        visitorName: conversation.visitorName,
        visitorEmail: conversation.visitorEmail,
        messageCount: messages.length,
        lastMessage: last ? { sender: last.sender, body: last.body, createdAt: last.createdAt } : null,
        lastMessageAt: conversation.lastMessageAt
    };
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

exports.getAccountOverview = async (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(404).json({ status: 'fail', message: 'Account not found.' });
    }
    try {
        const account = await usersModel.getManagedAccountForAdmin(req.params.id);
        if (!account) return res.status(404).json({ status: 'fail', message: 'Account not found.' });

        const email = String(account.email || '').trim().toLowerCase();
        const [cars, products, autoThreads, groceryThreads] = await Promise.all([
            usedCars.getCarsForOwner(account._id, email),
            groceryProducts.getProductsForOwner(account._id, email),
            autoMessages.listForAccountAdmin(account),
            groceryMessages.listForAccountAdmin(account)
        ]);

        return res.json({
            status: 'success',
            data: {
                account,
                listings: {
                    cars: cars.map((car) => ({
                        _id: car._id, make: car.make, model: car.model, year: car.year, color: car.color,
                        price: car.price, country: car.country, state: car.state, mainImage: car.mainImage
                    })),
                    products: products.map((product) => ({
                        _id: product._id, title: product.title, category: product.category, unit: product.unit,
                        price: product.price, country: product.country, state: product.state,
                        mainPhoto: product.mainPhoto, createdAt: product.createdAt
                    }))
                },
                conversations: [
                    ...autoThreads.map((thread) => conversationSummary('auto', thread, account._id)),
                    ...groceryThreads.map((thread) => conversationSummary('groceries', thread, account._id))
                ].sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt))
            }
        });
    } catch (error) {
        return next(error);
    }
};

exports.setAccountStatus = async (req, res, next) => {
    const { isActive } = req.body || {};
    if (typeof isActive !== 'boolean') {
        return res.status(400).json({ status: 'fail', message: 'Provide isActive as true or false.' });
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(404).json({ status: 'fail', message: 'Account not found.' });
    }
    try {
        const account = await usersModel.setActiveForAdmin(req.params.id, isActive);
        if (!account) return res.status(404).json({ status: 'fail', message: 'Account not found.' });
        return res.json({ status: 'success', data: account });
    } catch (error) {
        return next(error);
    }
};

exports.addWarning = async (req, res, next) => {
    const { message } = req.body || {};
    if (!validText(message, 1000)) {
        return res.status(400).json({ status: 'fail', message: 'Warning message must be between 1 and 1000 characters.' });
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(404).json({ status: 'fail', message: 'Account not found.' });
    }
    try {
        const account = await usersModel.addWarningForAdmin(req.params.id, message.trim());
        if (!account) return res.status(404).json({ status: 'fail', message: 'Account not found.' });
        return res.status(201).json({ status: 'success', data: account });
    } catch (error) {
        return next(error);
    }
};

exports.removeWarning = async (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(req.params.warningId)) {
        return res.status(404).json({ status: 'fail', message: 'Warning not found.' });
    }
    try {
        const account = await usersModel.removeWarningForAdmin(req.params.id, req.params.warningId);
        if (!account) return res.status(404).json({ status: 'fail', message: 'Warning not found.' });
        return res.json({ status: 'success', data: account });
    } catch (error) {
        return next(error);
    }
};

exports.getConversation = async (req, res, next) => {
    const store = CONVERSATION_PLATFORMS[req.params.platform];
    if (!store || !mongoose.isValidObjectId(req.params.conversationId)) {
        return res.status(404).json({ status: 'fail', message: 'Conversation not found.' });
    }
    try {
        const conversation = await store.getByIdAdmin(req.params.conversationId);
        if (!conversation) return res.status(404).json({ status: 'fail', message: 'Conversation not found.' });
        return res.json({ status: 'success', data: { ...conversation, platform: req.params.platform } });
    } catch (error) {
        return next(error);
    }
};

exports.deleteConversation = async (req, res, next) => {
    const store = CONVERSATION_PLATFORMS[req.params.platform];
    if (!store || !mongoose.isValidObjectId(req.params.conversationId)) {
        return res.status(404).json({ status: 'fail', message: 'Conversation not found.' });
    }
    try {
        const deleted = await store.deleteByIdAdmin(req.params.conversationId);
        if (!deleted) return res.status(404).json({ status: 'fail', message: 'Conversation not found.' });
        return res.json({ status: 'success', message: 'Conversation deleted.' });
    } catch (error) {
        return next(error);
    }
};