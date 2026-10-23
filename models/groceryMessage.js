const mongoose = require('mongoose');
const DB = require('../lib/db');

const schema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, required: true },
    vehicleLabel: { type: String, required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    visitorId: { type: mongoose.Schema.Types.ObjectId, required: true },
    visitorName: { type: String, required: true },
    visitorEmail: { type: String, required: true },
    messages: [{
        sender: { type: String, enum: ['visitor', 'owner'], required: true },
        body: { type: String, required: true, maxlength: 2000 },
        createdAt: { type: Date, default: Date.now }
    }],
    ownerUnreadCount: { type: Number, default: 1 },
    visitorUnreadCount: { type: Number, default: 0 },
    lastMessageAt: { type: Date, default: Date.now }
}, { timestamps: true });
schema.index({ ownerId: 1, lastMessageAt: -1 });
schema.index({ visitorId: 1, lastMessageAt: -1 });
const model = DB.getModel('groceries', 'GroceryMessage', schema);

module.exports = {
    create: (data) => model.create(data),
    listForOwner: (ownerId) => model.find({ ownerId }).sort({ lastMessageAt: -1 }).lean().exec(),
    listForVisitor: (visitorId) => model.find({ visitorId }).sort({ lastMessageAt: -1 }).lean().exec(),
    markVisitorRead: (id, visitorId) => model.findOneAndUpdate(
        { _id: id, visitorId }, { $set: { visitorUnreadCount: 0 } }, { new: true }
    ).lean().exec(),
    appendMessage: (id, accountId, sender, body) => model.findOneAndUpdate(
        { _id: id, [sender === 'owner' ? 'ownerId' : 'visitorId']: accountId },
        { $push: { messages: { sender, body, createdAt: new Date() } },
            $inc: { [sender === 'owner' ? 'visitorUnreadCount' : 'ownerUnreadCount']: 1 },
            $set: { lastMessageAt: new Date() } },
        { new: true, runValidators: true }
    ).lean().exec(),
    markOwnerRead: (id, ownerId) => model.findOneAndUpdate(
        { _id: id, ownerId }, { $set: { ownerUnreadCount: 0 } }, { new: true }
    ).lean().exec(),
    // Admin oversight: every thread where the account is the seller or the visitor.
    listForAccountAdmin: (account) => model.find({ $or: [{ ownerId: account._id }, { visitorId: account._id }] })
        .sort({ lastMessageAt: -1 }).lean().exec(),
    getByIdAdmin: (id) => model.findById(id).lean().exec(),
    deleteByIdAdmin: (id) => model.findByIdAndDelete(id).select('_id').lean().exec()
};
