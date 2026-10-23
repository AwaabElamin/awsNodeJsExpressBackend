const mongoose = require('mongoose');
const DB = require('../lib/db');

const messageSchema = new mongoose.Schema({
    sender: { type: String, enum: ['visitor', 'owner'], required: true },
    body: { type: String, required: true, maxlength: 2000 },
    delivery: { type: String, enum: ['email'] },
    createdAt: { type: Date, default: Date.now }
}, { _id: true });

const autoMessageSchema = new mongoose.Schema({
    vehicleId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    vehicleLabel: { type: String, required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    visitorId: { type: mongoose.Schema.Types.ObjectId, index: true },
    visitorName: { type: String, required: true, maxlength: 100 },
    visitorEmail: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
    visitorTokenHash: { type: String, required: true, select: false },
    messages: { type: [messageSchema], default: [] },
    ownerUnreadCount: { type: Number, default: 1 },
    visitorUnreadCount: { type: Number, default: 0 },
    lastMessageAt: { type: Date, default: Date.now }
}, { timestamps: true });

autoMessageSchema.index({ ownerId: 1, lastMessageAt: -1 });
autoMessageSchema.index({ visitorId: 1, lastMessageAt: -1 });
const autoMessageModel = DB.getModel('carshop', 'autoMessages', autoMessageSchema);

class AutoMessageCollection {
    static visitorFilter(account) {
        return { $or: [
            { visitorId: account._id },
            { visitorId: null, visitorEmail: account.email.trim().toLowerCase() }
        ] };
    }

    static async listForVisitor(account) {
        return autoMessageModel.find(this.visitorFilter(account)).select('-visitorTokenHash').sort({ lastMessageAt: -1 }).lean().exec();
    }

    static async readForAccount(id, account) {
        return autoMessageModel.findOneAndUpdate(
            { _id: id, ...this.visitorFilter(account) }, { $set: { visitorUnreadCount: 0 } }, { new: true }
        ).select('-visitorTokenHash').lean().exec();
    }

    static async appendForAccount(id, account, body) {
        return autoMessageModel.findOneAndUpdate(
            { _id: id, ...this.visitorFilter(account) },
            { $push: { messages: { sender: 'visitor', body, createdAt: new Date() } },
                $inc: { ownerUnreadCount: 1 }, $set: { lastMessageAt: new Date() } },
            { new: true, runValidators: true }
        ).select('-visitorTokenHash').lean().exec();
    }

    static async appendOwnerMessage(id, ownerId, body) {
        return autoMessageModel.findOneAndUpdate(
            { _id: id, ownerId },
            { $push: { messages: { sender: 'owner', body, createdAt: new Date() } },
                $inc: { visitorUnreadCount: 1 }, $set: { lastMessageAt: new Date() } },
            { new: true, runValidators: true }
        ).select('-visitorTokenHash').lean().exec();
    }

    static async createConversation(data) {
        return autoMessageModel.create(data);
    }

    static async listForOwner(ownerId) {
        return autoMessageModel.find({ ownerId })
            .select('-visitorTokenHash')
            .sort({ lastMessageAt: -1 })
            .lean()
            .exec();
    }

    static async getForOwner(id, ownerId) {
        return autoMessageModel.findOne({ _id: id, ownerId })
            .select('-visitorTokenHash')
            .lean()
            .exec();
    }

    static async markOwnerRead(id, ownerId) {
        return autoMessageModel.findOneAndUpdate(
            { _id: id, ownerId },
            { $set: { ownerUnreadCount: 0 } },
            { new: true }
        ).select('-visitorTokenHash').lean().exec();
    }

    static async getForVisitor(id, visitorTokenHash) {
        return autoMessageModel.findOne({ _id: id, visitorTokenHash })
            .select('-visitorTokenHash')
            .lean()
            .exec();
    }

    static async markVisitorRead(id, visitorTokenHash) {
        return autoMessageModel.findOneAndUpdate(
            { _id: id, visitorTokenHash },
            { $set: { visitorUnreadCount: 0 } },
            { new: true }
        ).select('-visitorTokenHash').lean().exec();
    }

    static async appendVisitorMessage(id, visitorTokenHash, body) {
        return autoMessageModel.findOneAndUpdate(
            { _id: id, visitorTokenHash },
            {
                $push: { messages: { sender: 'visitor', body, createdAt: new Date() } },
                $inc: { ownerUnreadCount: 1 },
                $set: { lastMessageAt: new Date() }
            },
            { new: true }
        ).select('-visitorTokenHash').lean().exec();
    }

    // Admin oversight: every thread where the account is the seller or the visitor.
    static adminAccountFilter(account) {
        const email = String(account.email || '').trim().toLowerCase();
        return { $or: [
            { ownerId: account._id },
            { visitorId: account._id },
            { visitorId: null, visitorEmail: email }
        ] };
    }

    static async listForAccountAdmin(account) {
        return autoMessageModel.find(this.adminAccountFilter(account))
            .select('-visitorTokenHash')
            .sort({ lastMessageAt: -1 })
            .lean()
            .exec();
    }

    static async getByIdAdmin(id) {
        return autoMessageModel.findById(id).select('-visitorTokenHash').lean().exec();
    }

    static async deleteByIdAdmin(id) {
        return autoMessageModel.findByIdAndDelete(id).select('_id').lean().exec();
    }
}

module.exports = AutoMessageCollection;
