const crypto = require('crypto');
const mongoose = require('mongoose');
const users = require('../models/users');
const usedCars = require('../models/autoUsedCar');
const messages = require('../models/autoMessage');

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const cleanText = (value, limit) => typeof value === 'string' ? value.trim().slice(0, limit) : '';
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

function getGuestToken(req, res) {
    const token = String(req.headers['x-auto-conversation-token'] || '').trim();
    if (!token || token.length > 200) {
        res.status(401).json({ status: 'fail', message: 'Conversation access token is required.' });
        return null;
    }
    return hashToken(token);
}

function validateMessage(value) {
    const body = cleanText(value, 2000);
    return body.length >= 1 ? body : '';
}

function toGuestConversation(conversation) {
    return {
        _id: conversation._id,
        vehicleLabel: conversation.vehicleLabel,
        visitorName: conversation.visitorName,
        visitorEmail: conversation.visitorEmail,
        messages: conversation.messages,
        visitorUnreadCount: conversation.visitorUnreadCount,
        lastMessageAt: conversation.lastMessageAt
    };
}

exports.startConversation = async (req, res, next) => {
    try {
        const vehicleId = String(req.body?.vehicleId || '').trim();
        const visitorName = cleanText(req.body?.visitorName, 100);
        const visitorEmail = normalizeEmail(req.body?.visitorEmail);
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
        if (!body) {
            return res.status(400).json({ status: 'fail', message: 'A message is required.' });
        }
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
    const tokenHash = getGuestToken(req, res);
    if (!tokenHash) return;

    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({ status: 'fail', message: 'Conversation not found.' });
        }
        const conversation = await messages.markVisitorRead(req.params.id, tokenHash);
        if (!conversation) {
            return res.status(404).json({ status: 'fail', message: 'Conversation not found.' });
        }
        return res.json({ status: 'success', data: toGuestConversation(conversation) });
    } catch (error) {
        return next(error);
    }
};

exports.replyAsVisitor = async (req, res, next) => {
    const tokenHash = getGuestToken(req, res);
    if (!tokenHash) return;

    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({ status: 'fail', message: 'Conversation not found.' });
        }
        const body = validateMessage(req.body?.message);
        if (!body) {
            return res.status(400).json({ status: 'fail', message: 'A message is required.' });
        }
        const conversation = await messages.appendVisitorMessage(req.params.id, tokenHash, body);
        if (!conversation) {
            return res.status(404).json({ status: 'fail', message: 'Conversation not found.' });
        }
        return res.json({ status: 'success', data: toGuestConversation(conversation) });
    } catch (error) {
        return next(error);
    }
};
