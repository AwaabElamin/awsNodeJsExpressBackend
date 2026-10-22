const mongoose = require('mongoose');

const sellerSchema = new mongoose.Schema({
    ownerId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true },
    trackingId: { type: String, required: true, unique: true },
    merchantId: String,
    ready: { type: Boolean, default: false }
}, { timestamps: true });

const paymentSchema = new mongoose.Schema({
    buyerId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    platform: { type: String, enum: ['auto', 'groceries'], required: true },
    listingId: { type: mongoose.Schema.Types.ObjectId, required: true },
    label: { type: String, required: true },
    merchantId: { type: String, required: true },
    amountCents: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    environment: { type: String, default: 'sandbox' },
    requestKey: { type: String, required: true },
    paypalOrderId: { type: String, unique: true, sparse: true },
    captureId: { type: String, index: true },
    status: { type: String, enum: ['CREATING', 'APPROVAL_REQUIRED', 'PENDING', 'COMPLETED', 'REFUNDED', 'REVERSED', 'FAILED'], default: 'CREATING' },
    approvalUrl: String
}, { timestamps: true });
paymentSchema.index({ buyerId: 1, requestKey: 1 }, { unique: true });

module.exports = {
    Seller: mongoose.models.PaypalSeller || mongoose.model('PaypalSeller', sellerSchema),
    Payment: mongoose.models.MarketplacePayment || mongoose.model('MarketplacePayment', paymentSchema)
};
