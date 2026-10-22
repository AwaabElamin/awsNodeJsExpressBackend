const { randomUUID } = require('crypto');

class PaymentError extends Error {
    constructor(status, message) { super(message); this.status = status; }
}

function config() {
    const required = ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'PAYPAL_PARTNER_MERCHANT_ID', 'PAYPAL_PARTNER_ATTRIBUTION_ID', 'PAYPAL_WEBHOOK_ID', 'PAYPAL_FRONTEND_URL'];
    const enabled = process.env.PAYPAL_ENABLED === 'true' && required.every(key => process.env[key]);
    return { enabled, environment: 'sandbox', currency: 'USD' };
}

function requireConfig() {
    if (!config().enabled) throw new PaymentError(503, 'PayPal Sandbox payments are not configured yet.');
    const url = new URL(process.env.PAYPAL_FRONTEND_URL);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname))) {
        throw new PaymentError(503, 'PayPal return URL must use HTTPS or local development HTTP.');
    }
}

async function request(path, { method = 'GET', body, requestId, merchantId } = {}) {
    requireConfig();
    const base = 'https://api-m.sandbox.paypal.com';
    const tokenResponse = await fetch(`${base}/v1/oauth2/token`, {
        method: 'POST', signal: AbortSignal.timeout(20000),
        headers: { Authorization: `Basic ${Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=client_credentials'
    });
    if (!tokenResponse.ok) throw new PaymentError(502, 'Unable to authenticate with PayPal Sandbox. Check the platform configuration.');
    const token = await tokenResponse.json();
    const headers = {
        Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json',
        'PayPal-Partner-Attribution-Id': process.env.PAYPAL_PARTNER_ATTRIBUTION_ID
    };
    if (requestId) headers['PayPal-Request-Id'] = requestId;
    if (merchantId) {
        const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
        headers['PayPal-Auth-Assertion'] = `${encode({ alg: 'none' })}.${encode({ iss: process.env.PAYPAL_CLIENT_ID, payer_id: merchantId })}.`;
    }
    const response = await fetch(`${base}${path}`, {
        method, headers, signal: AbortSignal.timeout(25000),
        ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
    if (!response.ok) {
        console.error('PayPal request failed', { path, status: response.status, debugId: response.headers.get('paypal-debug-id') });
        throw new PaymentError(502, 'PayPal could not complete this operation. Retry or check the payment status before paying again.');
    }
    return response.status === 204 ? {} : response.json();
}

function money(value) {
    const amount = typeof value === 'number' ? value : Number.NaN;
    const cents = Math.round(amount * 100);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000 || Math.abs(amount * 100 - cents) > 0.000001) {
        throw new PaymentError(400, 'The seller must set a positive USD price with at most two decimal places.');
    }
    return cents;
}

function approvalUrl(data) {
    const link = data.links?.find(item => ['payer-action', 'approve', 'action_url'].includes(item.rel))?.href;
    let url;
    try { url = new URL(link); } catch { throw new PaymentError(502, 'PayPal did not return an approval link.'); }
    if (url.protocol !== 'https:' || !['www.sandbox.paypal.com', 'sandbox.paypal.com'].includes(url.hostname)) {
        throw new PaymentError(502, 'PayPal returned an unexpected approval address.');
    }
    return url.href;
}

function validateOrder(data, payment) {
    if (data.id !== payment.paypalOrderId || data.intent !== 'CAPTURE') {
        throw new PaymentError(502, 'PayPal order identity does not match this payment.');
    }
    const units = data.purchase_units;
    if (!Array.isArray(units) || units.length !== 1) throw new PaymentError(502, 'PayPal order does not match this payment.');
    const unit = units[0];
    if (unit.reference_id !== String(payment._id) || unit.custom_id !== String(payment._id)
        || unit.payee?.merchant_id !== payment.merchantId || unit.amount?.currency_code !== 'USD'
        || unit.amount?.value !== (payment.amountCents / 100).toFixed(2)) {
        throw new PaymentError(502, 'PayPal recipient or amount does not match this payment.');
    }
    return unit;
}

function returnUrl(path) { return new URL(path, process.env.PAYPAL_FRONTEND_URL).href; }

module.exports = { request, config, requireConfig, money, approvalUrl, validateOrder, returnUrl, PaymentError, randomUUID };
