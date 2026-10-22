const mongoose = require('mongoose');
const products = require('../models/groceryProduct');
const users = require('../models/users');
const messages = require('../models/groceryMessage');

exports.create = async (req, res, next) => {
    try {
        if (!req.account) return res.status(401).json({ status: 'fail', message: 'Register and sign in before messaging a seller.' });
        const { productId, message } = req.body || {};
        if (!mongoose.isValidObjectId(productId) || typeof message !== 'string' || !message.trim() || message.trim().length > 2000) {
            return res.status(400).json({ status: 'fail', message: 'Choose a product and enter a message of 1 to 2000 characters.' });
        }
        const product = await products.getContactTarget(productId);
        if (!product) return res.status(404).json({ status: 'fail', message: 'Product not found.' });
        let owner = product.ownerId ? await users.findPlatformOwnerById(product.ownerId, 'groceries') : null;
        if (!owner && product.email) owner = await users.findPlatformOwnerByEmail(product.email, 'groceries');
        if (!owner) return res.status(404).json({ status: 'fail', message: 'This seller is not accepting inquiries.' });
        const name = [req.account.firstname, req.account.lastname].filter(Boolean).join(' ').trim();
        if (!name) return res.status(400).json({ status: 'fail', message: 'Add your name to your account before sending an inquiry.' });
        const conversation = await messages.create({
            productId: product._id,
            vehicleLabel: product.title,
            ownerId: owner._id,
            visitorId: req.account._id,
            visitorName: name,
            visitorEmail: req.account.email,
            messages: [{ sender: 'visitor', body: message.trim() }]
        });
        return res.status(201).json({ status: 'success', data: conversation, message: 'Message saved. Continue chatting from My account.' });
    } catch (error) { return next(error); }
};

exports.listForVisitor = async (req, res, next) => {
    try {
        return res.json({ status: 'success', data: await messages.listForVisitor(req.account._id) });
    } catch (error) { return next(error); }
};

exports.getForVisitor = async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ status: 'fail', message: 'Chat not found.' });
        const conversation = await messages.markVisitorRead(req.params.id, req.account._id);
        if (!conversation) return res.status(404).json({ status: 'fail', message: 'Chat not found.' });
        return res.json({ status: 'success', data: conversation });
    } catch (error) { return next(error); }
};

const reply = (sender) => async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ status: 'fail', message: 'Chat not found.' });
        const message = req.body?.message;
        if (typeof message !== 'string' || !message.trim() || message.trim().length > 2000) {
            return res.status(400).json({ status: 'fail', message: 'Enter a message of 1 to 2000 characters.' });
        }
        const conversation = await messages.appendMessage(req.params.id, req.account._id, sender, message.trim());
        if (!conversation) return res.status(404).json({ status: 'fail', message: 'Chat not found.' });
        return res.json({ status: 'success', data: conversation });
    } catch (error) { return next(error); }
};

exports.replyAsOwner = reply('owner');
exports.replyAsVisitor = reply('visitor');

exports.list = async (req, res, next) => {
    try {
        return res.json({ status: 'success', data: await messages.listForOwner(req.account._id) });
    } catch (error) { return next(error); }
};

exports.get = async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ status: 'fail', message: 'Inquiry not found.' });
        const conversation = await messages.markOwnerRead(req.params.id, req.account._id);
        if (!conversation) return res.status(404).json({ status: 'fail', message: 'Inquiry not found.' });
        return res.json({ status: 'success', data: conversation });
    } catch (error) { return next(error); }
};
