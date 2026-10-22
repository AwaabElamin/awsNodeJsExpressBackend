const mongoose = require('mongoose');
const paypal = require('../lib/paypal');
const { Seller, Payment } = require('../models/payment');
const cars = require('../models/autoUsedCar');
const groceries = require('../models/groceryProduct');
const users = require('../models/users');

const handle = fn => async (req, res) => {
    try { await fn(req, res); }
    catch (error) {
        console.error('Marketplace payment operation failed:', error.message);
        res.status(error instanceof paypal.PaymentError ? error.status : 500).json({
            status: 'fail', message: error instanceof paypal.PaymentError ? error.message : 'Payment operation failed. Check payment history before trying again.'
        });
    }
};
const fail = (status, message) => { throw new paypal.PaymentError(status, message); };
const sellerOnly = req => {
    if (!['Client', 'Admin'].includes(req.account.role)) fail(403, 'Create your Client workspace before connecting PayPal.');
};
const summary = item => ({
    _id: item._id, platform: item.platform, listingId: item.listingId, label: item.label,
    amountCents: item.amountCents, currency: item.currency, status: item.status,
    environment: item.environment, paypalOrderId: item.paypalOrderId, createdAt: item.createdAt
});

async function verifySeller(seller) {
    const partner = encodeURIComponent(process.env.PAYPAL_PARTNER_MERCHANT_ID);
    const data = await paypal.request(`/v1/customer/partners/${partner}/merchant-integrations?tracking_id=${encodeURIComponent(seller.trackingId)}`);
    if (!data.merchant_id || data.tracking_id !== seller.trackingId) fail(409, 'Complete seller onboarding in PayPal first.');
    const details = await paypal.request(`/v1/customer/partners/${partner}/merchant-integrations/${encodeURIComponent(data.merchant_id)}`);
    const ready = details.merchant_id === data.merchant_id && details.tracking_id === seller.trackingId
        && details.payments_receivable === true && details.primary_email_confirmed === true
        && details.products?.some(product => product.name === 'EXPRESS_CHECKOUT' && product.status === 'ACTIVE')
        && details.oauth_integrations?.some(integration => integration.oauth_third_party?.some(permission =>
            permission.partner_client_id === process.env.PAYPAL_CLIENT_ID
            && permission.scopes?.includes('https://uri.paypal.com/services/payments/payment/authcapture')));
    await Seller.updateOne({ _id: seller._id }, { $set: { merchantId: data.merchant_id, ready: Boolean(ready) } });
    if (!ready) fail(409, 'PayPal has not enabled this seller to receive platform payments yet.');
    return data.merchant_id;
}

exports.config = handle(async (req, res) => res.json({ status: 'success', data: paypal.config() }));
exports.sellerStatus = handle(async (req, res) => {
    sellerOnly(req);
    const seller = await Seller.findOne({ ownerId: req.account._id }).lean();
    res.json({ status: 'success', data: { ...paypal.config(), connected: !!seller?.ready } });
});
exports.onboard = handle(async (req, res) => {
    sellerOnly(req);
    paypal.requireConfig();
    if (req.body?.consent !== true) fail(400, 'Consent to share onboarding data with PayPal is required.');
    const seller = await Seller.findOneAndUpdate({ ownerId: req.account._id }, {
        $setOnInsert: { trackingId: paypal.randomUUID() }
    }, { upsert: true, new: true });
    const data = await paypal.request('/v2/customer/partner-referrals', {
        method: 'POST', body: {
            tracking_id: seller.trackingId,
            operations: [{ operation: 'API_INTEGRATION', api_integration_preference: {
                rest_api_integration: { integration_method: 'PAYPAL', integration_type: 'THIRD_PARTY',
                    third_party_details: { features: ['PAYMENT', 'REFUND'] } }
            } }],
            products: ['EXPRESS_CHECKOUT'],
            legal_consents: [{ type: 'SHARE_DATA_CONSENT', granted: true }],
            partner_config_override: { return_url: paypal.returnUrl('/user') }
        }
    });
    res.json({ status: 'success', data: { url: paypal.approvalUrl(data) } });
});
exports.refreshSeller = handle(async (req, res) => {
    sellerOnly(req);
    paypal.requireConfig();
    const seller = await Seller.findOne({ ownerId: req.account._id });
    if (!seller) fail(409, 'Connect PayPal first.');
    await verifySeller(seller);
    res.json({ status: 'success', data: { connected: true } });
});

exports.create = handle(async (req, res) => {
    paypal.requireConfig();
    const { platform, listingId, requestKey } = req.body || {};
    if (!['auto', 'groceries'].includes(platform) || !mongoose.isValidObjectId(listingId)
        || typeof requestKey !== 'string' || !/^[a-f0-9-]{36}$/i.test(requestKey)) fail(400, 'Choose a valid listing and checkout request.');
    let payment = await Payment.findOne({ buyerId: req.account._id, requestKey });
    if (payment && (payment.platform !== platform || String(payment.listingId) !== listingId)) fail(409, 'This checkout request belongs to another listing.');
    if (!payment) {
        const listing = platform === 'auto' ? await cars.getContactTarget(listingId) : await groceries.getContactTarget(listingId);
        if (!listing) fail(404, 'Listing not found.');
        let owner = listing.ownerId ? await users.findPlatformOwnerById(listing.ownerId, platform) : null;
        if (!owner && listing.email) owner = await users.findPlatformOwnerByEmail(listing.email, platform);
        if (!owner || String(owner._id) === String(req.account._id)) fail(409, 'Choose a listing from another available seller.');
        const seller = await Seller.findOne({ ownerId: owner._id });
        if (!seller) fail(409, 'This seller has not connected PayPal Sandbox yet.');
        const merchantId = await verifySeller(seller);
        const values = {
            buyerId: req.account._id, sellerId: owner._id, platform, listingId, requestKey, merchantId,
            amountCents: paypal.money(listing.price),
            label: platform === 'auto' ? [listing.year, listing.make, listing.model].filter(Boolean).join(' ') : listing.title
        };
        try { payment = await Payment.findOneAndUpdate({ buyerId: req.account._id, requestKey }, { $setOnInsert: values }, { upsert: true, new: true }); }
        catch (error) {
            if (error.code !== 11000) throw error;
            payment = await Payment.findOne({ buyerId: req.account._id, requestKey });
        }
        if (!payment || payment.platform !== platform || String(payment.listingId) !== listingId) fail(409, 'Checkout request conflict.');
    }
    if (!payment.paypalOrderId) {
        if (Date.now() - new Date(payment.createdAt).getTime() > 5 * 60 * 60 * 1000) {
            fail(409, 'This unresolved checkout needs support review before retrying. Do not start another payment.');
        }
        const id = String(payment._id);
        const data = await paypal.request('/v2/checkout/orders', {
            method: 'POST', merchantId: payment.merchantId, requestId: `create-${id}`,
            body: {
                intent: 'CAPTURE',
                purchase_units: [{
                    reference_id: id, custom_id: id, description: payment.label.slice(0, 127),
                    amount: { currency_code: 'USD', value: (payment.amountCents / 100).toFixed(2) },
                    payee: { merchant_id: payment.merchantId },
                    payment_instruction: { disbursement_mode: 'INSTANT' }
                }],
                payment_source: { paypal: { experience_context: {
                    brand_name: 'Awaaab LLC', user_action: 'PAY_NOW', shipping_preference: 'NO_SHIPPING',
                    return_url: paypal.returnUrl('/payments/return'), cancel_url: paypal.returnUrl('/payments/cancel')
                } } }
            }
        });
        if (!data.id) fail(502, 'PayPal did not return an order ID.');
        payment = await Payment.findOneAndUpdate({ _id: payment._id, status: 'CREATING' }, {
            $set: { paypalOrderId: data.id, approvalUrl: paypal.approvalUrl(data), status: 'APPROVAL_REQUIRED' }
        }, { new: true }) || await Payment.findById(payment._id);
    }
    if (payment.status !== 'APPROVAL_REQUIRED') fail(409, 'This checkout is already processed. Check your payment history.');
    res.json({ status: 'success', data: { ...summary(payment), approvalUrl: payment.approvalUrl } });
});

async function reconcile(payment, capture = false) {
    let data = await paypal.request(`/v2/checkout/orders/${encodeURIComponent(payment.paypalOrderId)}`, { merchantId: payment.merchantId });
    paypal.validateOrder(data, payment);
    if (capture && data.status === 'APPROVED') {
        await paypal.request(`/v2/checkout/orders/${encodeURIComponent(payment.paypalOrderId)}/capture`, {
            method: 'POST', body: {}, merchantId: payment.merchantId, requestId: `capture-${payment._id}`
        });
        data = await paypal.request(`/v2/checkout/orders/${encodeURIComponent(payment.paypalOrderId)}`, { merchantId: payment.merchantId });
    }
    const unit = paypal.validateOrder(data, payment);
    const captures = unit.payments?.captures || [];
    if (captures.length) {
        const captured = captures[0];
        if (captures.length !== 1 || captured.amount?.currency_code !== 'USD'
            || captured.amount?.value !== (payment.amountCents / 100).toFixed(2)) fail(502, 'Captured amount does not match this payment.');
        const status = { COMPLETED: 'COMPLETED', REFUNDED: 'REFUNDED', PARTIALLY_REFUNDED: 'REFUNDED',
            DECLINED: 'FAILED', DENIED: 'FAILED', FAILED: 'FAILED', PENDING: 'PENDING' }[captured.status];
        if (!status || !captured.id) fail(502, 'PayPal returned an unrecognized capture status.');
        await Payment.updateOne({ _id: payment._id, status: { $nin: ['REFUNDED', 'REVERSED', ...(!['COMPLETED', 'REFUNDED'].includes(status) ? ['COMPLETED'] : [])] } },
            { $set: { status, captureId: captured.id } });
    }
    return Payment.findById(payment._id);
}
exports.capture = handle(async (req, res) => {
    paypal.requireConfig();
    const orderId = req.body?.orderId;
    if (typeof orderId !== 'string' || !/^[A-Z0-9]{5,40}$/.test(orderId)) fail(400, 'A valid PayPal order is required.');
    const payment = await Payment.findOne({ buyerId: req.account._id, paypalOrderId: orderId });
    if (!payment) fail(404, 'Payment not found for this account.');
    res.json({ status: 'success', data: summary(await reconcile(payment, true)) });
});
exports.history = handle(async (req, res) => {
    const records = await Payment.find({ $or: [{ buyerId: req.account._id }, { sellerId: req.account._id }] }).sort({ createdAt: -1 }).limit(100).lean();
    res.json({ status: 'success', data: records.map(item => ({ ...summary(item), direction: String(item.buyerId) === String(req.account._id) ? 'purchase' : 'sale' })) });
});
exports.refresh = handle(async (req, res) => {
    paypal.requireConfig();
    if (!mongoose.isValidObjectId(req.params.id)) fail(404, 'Payment not found.');
    const payment = await Payment.findOne({ _id: req.params.id, $or: [{ buyerId: req.account._id }, { sellerId: req.account._id }] });
    if (!payment || !payment.paypalOrderId) fail(404, 'PayPal order not found.');
    res.json({ status: 'success', data: summary(await reconcile(payment)) });
});
exports.webhook = handle(async (req, res) => {
    paypal.requireConfig();
    const data = await paypal.request('/v1/notifications/verify-webhook-signature', {
        method: 'POST', body: {
            auth_algo: req.get('paypal-auth-algo'), cert_url: req.get('paypal-cert-url'),
            transmission_id: req.get('paypal-transmission-id'), transmission_sig: req.get('paypal-transmission-sig'),
            transmission_time: req.get('paypal-transmission-time'), webhook_id: process.env.PAYPAL_WEBHOOK_ID,
            webhook_event: req.body
        }
    });
    if (data.verification_status !== 'SUCCESS') fail(400, 'Invalid PayPal webhook signature.');
    const resource = req.body.resource;
    const orderId = resource?.supplementary_data?.related_ids?.order_id;
    const captureLink = resource?.links?.find(link => link.rel === 'up')?.href;
    const captureFromLink = typeof captureLink === 'string'
        ? /^https:\/\/api(?:-m)?\.sandbox\.paypal\.com\/v2\/payments\/captures\/([A-Z0-9]+)$/.exec(captureLink)?.[1] : null;
    const captureId = resource?.supplementary_data?.related_ids?.capture_id || captureFromLink
        || (req.body.event_type === 'PAYMENT.CAPTURE.REVERSED' ? resource?.id : null);
    const payment = orderId ? await Payment.findOne({ paypalOrderId: orderId })
        : captureId ? await Payment.findOne({ captureId }) : null;
    if (payment) {
        if (['PAYMENT.CAPTURE.REFUNDED', 'PAYMENT.CAPTURE.REVERSED'].includes(req.body.event_type)) {
            // A partial refund is also flagged for review; it must never look fully paid.
            await Payment.updateOne({ _id: payment._id }, { $set: { status: req.body.event_type.endsWith('REFUNDED') ? 'REFUNDED' : 'REVERSED' } });
        } else await reconcile(payment);
    }
    res.json({ status: 'success' });
});
