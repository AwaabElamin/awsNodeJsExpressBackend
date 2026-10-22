const crypto = require('crypto');
const mongoose = require('mongoose');
const users = require('../models/users');
const usedCars = require('../models/autoUsedCar');
const messages = require('../models/autoMessage');

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const cleanText = (value, limit) => typeof value === 'string' ? value.trim().slice(0, limit) : '';
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

function validateMessage(value) {
    return typeof value === 'string' && value.trim().length >= 1 && value.trim().length <= 2000 ? value.trim() : '';
}

function toGuestConversation(conversation) {
    return {
        _id: conversation._id,
        vehicleLabel: conversation.vehicleLabel,
        visitorName: conversation.visitorName,
        visitorEmail: conversation.visitorEmail,
        messages: conversation.messages.filter((message) => message.delivery !== 'email'),
        visitorUnreadCount: conversation.visitorUnreadCount,
        lastMessageAt: conversation.lastMessageAt
    };
}

exports.startConversation = async (req, res, next) => {
    try {
        if (!req.account) return res.status(401).json({ status: 'fail', message: 'Register and sign in before messaging a seller.' });
        const vehicleId = String(req.body?.vehicleId || '').trim();
        const visitorName = cleanText([req.account.firstname, req.account.lastname].filter(Boolean).join(' '), 100);
        const visitorEmail = normalizeEmail(req.account.email);
        const body = validateMessage(req.body?.message);
        if (!mongoose.isValidObjectId(vehicleId)
            || visitorName.length < 2
            || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(visitorEmail)
            || !body) {
            return res.status(400).json({ status: 'fail', message: 'Provide a valid name, email, and message.' });
        }

        const vehicle = await usedCars.getContactTarget(vehicleId);
        if (!vehicle) {
            return res.status(404).json({ status: 'fail', message: 'Vehicle listing not found.' });
        }

        let owner = vehicle.ownerId ? await users.findPlatformOwnerById(vehicle.ownerId, 'auto') : null;
        if (!owner && vehicle.email) {
            owner = await users.findPlatformOwnerByEmail(normalizeEmail(vehicle.email), 'auto');
        }
        if (!owner) {
            return res.status(404).json({ status: 'fail', message: 'This listing is not currently accepting messages.' });
        }

        const visitorToken = crypto.randomBytes(32).toString('base64url');
        const vehicleLabel = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ').slice(0, 200);
        const conversation = await messages.createConversation({
            vehicleId: vehicle._id,
            vehicleLabel,
            ownerId: owner._id,
            visitorId: req.account._id,
            visitorName,
            visitorEmail,
            visitorTokenHash: hashToken(visitorToken),
            messages: [{ sender: 'visitor', body, createdAt: new Date() }],
            ownerUnreadCount: 1,
            visitorUnreadCount: 0,
            lastMessageAt: new Date()
        });

        return res.status(201).json({
            status: 'success',
            data: {
                id: conversation._id,
                visitorToken,
                vehicleLabel,
                visitorName,
                visitorEmail,
                messages: conversation.messages
            }
        });
    } catch (error) {
        return next(error);
    }
};

exports.listForOwner = async (req, res, next) => {
    try {
        const conversations = await messages.listForOwner(req.account._id);
        return res.json({ status: 'success', data: conversations });
    } catch (error) {
        return next(error);
    }
};

exports.getForOwner = async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({ status: 'fail', message: 'Conversation not found.' });
        }
        const conversation = await messages.markOwnerRead(req.params.id, req.account._id);
        if (!conversation) {
            return res.status(404).json({ status: 'fail', message: 'Conversation not found.' });
        }
        return res.json({ status: 'success', data: conversation });
    } catch (error) {
        return next(error);
    }
};

exports.replyAsOwner = async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({ status: 'fail', message: 'Conversation not found.' });
        }
        const body = validateMessage(req.body?.message);
        if (!body) return res.status(400).json({ status: 'fail', message: 'Enter a message of 1 to 2000 characters.' });
        const conversation = await messages.appendOwnerMessage(req.params.id, req.account._id, body);
        if (!conversation) {
            return res.status(404).json({ status: 'fail', message: 'Conversation not found.' });
        }
        return res.json({ status: 'success', data: conversation });
    } catch (error) {
        return next(error);
    }
};

exports.getForVisitor = async (req, res, next) => {
    if (!req.account) return res.status(401).json({ status: 'fail', message: 'Sign in to access your chat.' });

    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({ status: 'fail', message: 'Conversation not found.' });
        }
        const conversation = await messages.readForAccount(req.params.id, req.account);
        if (!conversation) {
            return res.status(404).json({ status: 'fail', message: 'Conversation not found.' });
        }
        return res.json({ status: 'success', data: toGuestConversation(conversation) });
    } catch (error) {
        return next(error);
    }
};

exports.replyAsVisitor = async (req, res, next) => {
    if (!req.account) return res.status(401).json({ status: 'fail', message: 'Sign in to access your chat.' });

    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({ status: 'fail', message: 'Conversation not found.' });
        }
        const body = validateMessage(req.body?.message);
        if (!body) {
            return res.status(400).json({ status: 'fail', message: 'Enter a message of 1 to 2000 characters.' });
        }
        const conversation = await messages.appendForAccount(req.params.id, req.account, body);
        if (!conversation) {
            return res.status(404).json({ status: 'fail', message: 'Conversation not found.' });
        }
        return res.json({ status: 'success', data: toGuestConversation(conversation) });
    } catch (error) {
        return next(error);
    }
};

exports.listForVisitor = async (req, res, next) => {
    try {
        const conversations = await messages.listForVisitor(req.account);
        return res.json({ status: 'success', data: conversations.map(toGuestConversation) });
    } catch (error) { return next(error); }
};
