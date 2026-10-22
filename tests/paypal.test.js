const assert = require('node:assert/strict');
const { test, beforeEach } = require('node:test');
const paypal = require('../lib/paypal');

test('USD money conversion rejects untrusted or fractional-cent amounts', () => {
    assert.equal(paypal.money(3.45), 345);
    assert.equal(paypal.money(1000000), 100000000);
    for (const value of [undefined, null, '3.45', 0, -1, NaN, Infinity, 1.001, 1000001]) {
        assert.throws(() => paypal.money(value), /positive USD price/);
    }
});
test('only PayPal Sandbox approval addresses are accepted', () => {
    assert.match(paypal.approvalUrl({ links: [{ rel: 'approve', href: 'https://www.sandbox.paypal.com/checkoutnow?token=test' }] }), /^https:/);
    for (const href of ['https://www.paypal.com/checkoutnow', 'https://sandbox.paypal.com.attacker.invalid', 'http://www.sandbox.paypal.com', 'javascript:alert(1)']) {
        assert.throws(() => paypal.approvalUrl({ links: [{ rel: 'approve', href }] }));
    }
});
const order = () => ({
    id: 'ORDER12345', intent: 'CAPTURE', status: 'APPROVED', purchase_units: [{
        reference_id: 'payment-id', custom_id: 'payment-id', payee: { merchant_id: 'seller-merchant' },
        amount: { currency_code: 'USD', value: '3.45' }
    }]
});
const payment = () => ({
    _id: 'payment-id', buyerId: 'buyer', sellerId: 'seller', merchantId: 'seller-merchant',
    paypalOrderId: 'ORDER12345',
    amountCents: 345, platform: 'groceries', listingId: '66df353d38a9a756b1b85ec4',
    requestKey: '11111111-1111-4111-a111-111111111111', status: 'CREATING', createdAt: new Date()
});
test('PayPal order verification checks recipient, references, USD amount, and unit count', () => {
    paypal.validateOrder(order(), payment());
    for (const mutate of [
        data => { data.purchase_units[0].payee.merchant_id = 'platform-not-seller'; },
        data => { data.purchase_units[0].amount.value = '0.01'; },
        data => { data.purchase_units[0].amount.currency_code = 'EUR'; },
        data => { data.purchase_units[0].custom_id = 'other'; },
        data => { data.purchase_units.push(data.purchase_units[0]); }
    ]) {
        const data = order(); mutate(data);
        assert.throws(() => paypal.validateOrder(data, payment()));
    }
});

function mock(name, exports) {
    const filename = require.resolve(name);
    require.cache[filename] = { id: filename, filename, loaded: true, exports };
}
let stored;
let updates;
let calls;
let payable = 3.45;
let remote;
let onboardingReady;
let validWebhook;
const seller = { _id: 'seller-record', ownerId: 'seller', trackingId: 'tracking' };
mock('../models/payment', {
    Seller: { findOne: async () => seller, updateOne: async () => {} },
    Payment: {
        findOne: async query => {
            if (query.buyerId && query.buyerId !== 'buyer') return null;
            if (query.paypalOrderId && stored?.paypalOrderId !== query.paypalOrderId) return null;
            return stored;
        },
        findById: async () => stored,
        findOneAndUpdate: async (query, update) => {
            if (update.$setOnInsert) {
                stored = { ...payment(), ...update.$setOnInsert };
                delete stored.paypalOrderId;
            }
            if (update.$set) Object.assign(stored, update.$set);
            return stored;
        },
        updateOne: async (query, update) => { updates.push(update); Object.assign(stored, update.$set); }
    }
});
mock('../models/groceryProduct', { getContactTarget: async () => ({ _id: 'listing', title: 'Rice', price: payable, ownerId: 'seller' }) });
mock('../models/autoUsedCar', { getContactTarget: async () => ({ _id: 'listing', make: 'Toyota', price: payable, ownerId: 'seller' }) });
mock('../models/users', { findPlatformOwnerById: async () => ({ _id: 'seller' }) });
paypal.requireConfig = () => {};
paypal.returnUrl = path => `http://127.0.0.1:5173${path}`;
paypal.request = async (path, options = {}) => {
    calls.push({ path, options });
    if (path.includes('tracking_id=')) return { merchant_id: 'seller-merchant', tracking_id: 'tracking' };
    if (path.includes('/merchant-integrations/')) return {
        merchant_id: 'seller-merchant', tracking_id: 'tracking', payments_receivable: onboardingReady,
        primary_email_confirmed: true, products: [{ name: 'EXPRESS_CHECKOUT', status: 'ACTIVE' }],
        oauth_integrations: [{ oauth_third_party: [{ partner_client_id: process.env.PAYPAL_CLIENT_ID,
            scopes: ['https://uri.paypal.com/services/payments/payment/authcapture'] }] }]
    };
    if (path === '/v2/checkout/orders') return {
        id: 'ORDER12345', links: [{ rel: 'approve', href: 'https://www.sandbox.paypal.com/checkoutnow?token=ORDER12345' }]
    };
    if (path.endsWith('/capture')) {
        remote.status = 'COMPLETED';
        remote.purchase_units[0].payments = { captures: [{ id: 'CAPTURE123', status: 'COMPLETED', amount: { currency_code: 'USD', value: '3.45' } }] };
        return remote;
    }
    if (path.includes('/v2/checkout/orders/')) return remote;
    if (path.includes('verify-webhook-signature')) return { verification_status: validWebhook ? 'SUCCESS' : 'FAILURE' };
    throw new Error(`Unexpected test PayPal request: ${path}`);
};
const controller = require('../controllers/payments');
const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
const request = () => ({
    account: { _id: 'buyer', role: 'Visitors' },
    body: { platform: 'groceries', listingId: '66df353d38a9a756b1b85ec4', requestKey: payment().requestKey,
        price: 0.01, merchantId: 'attacker', sellerId: 'attacker' }
});
beforeEach(() => { stored = null; updates = []; calls = []; remote = order(); payable = 3.45; onboardingReady = true; validWebhook = false; });
test('checkout uses database price and onboarded seller, ignores supplied price/payee, and reuses a request', async () => {
    const res = response();
    await controller.create(request(), res);
    assert.equal(res.code, 200);
    const create = calls.find(call => call.path === '/v2/checkout/orders');
    assert.equal(create.options.body.purchase_units[0].payee.merchant_id, 'seller-merchant');
    assert.equal(create.options.body.purchase_units[0].amount.value, '3.45');
    assert.equal(create.options.merchantId, 'seller-merchant');
    assert.equal(stored.amountCents, 345);
    await controller.create(request(), response());
    assert.equal(calls.filter(call => call.path === '/v2/checkout/orders').length, 1);
});
test('unready sellers and missing vehicle prices cannot take payments', async () => {
    onboardingReady = false;
    const denied = response();
    await controller.create(request(), denied);
    assert.equal(denied.code, 409);
    assert.equal(stored, null);
    onboardingReady = true; payable = undefined;
    const noPrice = response();
    const req = request(); req.body.platform = 'auto';
    await controller.create(req, noPrice);
    assert.equal(noPrice.code, 400);
    assert.equal(stored, null);
});
test('capture verifies PayPal amount and merchant and saves completion only after server confirmation', async () => {
    stored = { ...payment(), paypalOrderId: 'ORDER12345', status: 'APPROVAL_REQUIRED' };
    const res = response();
    await controller.capture({ account: { _id: 'buyer' }, body: { orderId: 'ORDER12345' } }, res);
    assert.equal(res.code, 200);
    assert.equal(res.body.data.status, 'COMPLETED');
    assert.equal(stored.captureId, 'CAPTURE123');
    const repeated = response();
    await controller.capture({ account: { _id: 'buyer' }, body: { orderId: 'ORDER12345' } }, repeated);
    assert.equal(calls.filter(call => call.path.endsWith('/capture')).length, 1);
});
test('unapproved orders, other buyers, and mismatched PayPal amounts never appear paid', async () => {
    stored = { ...payment(), paypalOrderId: 'ORDER12345', status: 'APPROVAL_REQUIRED' };
    const denied = response();
    await controller.capture({ account: { _id: 'stranger' }, body: { orderId: 'ORDER12345' } }, denied);
    assert.equal(denied.code, 404);
    remote.status = 'CREATED';
    const unapproved = response();
    await controller.capture({ account: { _id: 'buyer' }, body: { orderId: 'ORDER12345' } }, unapproved);
    assert.equal(unapproved.body.data.status, 'APPROVAL_REQUIRED');
    remote.purchase_units[0].amount.value = '0.01';
    const mismatch = response();
    await controller.capture({ account: { _id: 'buyer' }, body: { orderId: 'ORDER12345' } }, mismatch);
    assert.equal(mismatch.code, 502);
    assert.equal(updates.length, 0);
});
test('forged webhooks cannot update payment state', async () => {
    const res = response();
    await controller.webhook({ get: () => 'fake', body: { event_type: 'PAYMENT.CAPTURE.COMPLETED' } }, res);
    assert.equal(res.code, 400);
    assert.equal(updates.length, 0);
});
test('Visitors cannot connect a seller account', async () => {
    const res = response();
    await controller.onboard({ account: { role: 'Visitors' }, body: { consent: true } }, res);
    assert.equal(res.code, 403);
    assert.equal(calls.length, 0);
});
test('pending captures are not reported as completed', async () => {
    stored = { ...payment(), status: 'APPROVAL_REQUIRED' };
    remote.status = 'COMPLETED';
    remote.purchase_units[0].payments = { captures: [{ id: 'CAPTURE123', status: 'PENDING', amount: { currency_code: 'USD', value: '3.45' } }] };
    const res = response();
    await controller.capture({ account: { _id: 'buyer' }, body: { orderId: 'ORDER12345' } }, res);
    assert.equal(res.body.data.status, 'PENDING');
});
test('denied captures are recorded as failed rather than paid', async () => {
    stored = { ...payment(), status: 'APPROVAL_REQUIRED' };
    remote.status = 'COMPLETED';
    remote.purchase_units[0].payments = { captures: [{ id: 'CAPTURE123', status: 'DENIED', amount: { currency_code: 'USD', value: '3.45' } }] };
    const res = response();
    await controller.capture({ account: { _id: 'buyer' }, body: { orderId: 'ORDER12345' } }, res);
    assert.equal(res.code, 200);
    assert.equal(res.body.data.status, 'FAILED');
});
test('verified refund events find payments by capture links and flag even partial refunds', async () => {
    validWebhook = true;
    stored = { ...payment(), status: 'COMPLETED', captureId: 'CAPTURE123' };
    const res = response();
    await controller.webhook({ get: () => 'signature', body: {
        event_type: 'PAYMENT.CAPTURE.REFUNDED',
        resource: { id: 'REFUND123', links: [{ rel: 'up', href: 'https://api.sandbox.paypal.com/v2/payments/captures/CAPTURE123' }] }
    } }, res);
    assert.equal(res.code, 200);
    assert.equal(stored.status, 'REFUNDED');
});
