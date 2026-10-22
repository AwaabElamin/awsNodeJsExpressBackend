const assert = require('node:assert/strict');
const { test } = require('node:test');
const paypal = require('../lib/paypal');

test('PayPal is fail-closed when disabled and uses only Sandbox with server credentials when configured', async () => {
    const keys = ['PAYPAL_ENABLED', 'PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'PAYPAL_PARTNER_MERCHANT_ID',
        'PAYPAL_PARTNER_ATTRIBUTION_ID', 'PAYPAL_WEBHOOK_ID', 'PAYPAL_FRONTEND_URL'];
    const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
    const originalFetch = global.fetch;
    const calls = [];
    try {
        process.env.PAYPAL_ENABLED = 'false';
        assert.equal(paypal.config().enabled, false);
        await assert.rejects(paypal.request('/v2/checkout/orders'), error => error.status === 503);
        Object.assign(process.env, {
            PAYPAL_ENABLED: 'true', PAYPAL_CLIENT_ID: 'test-client', PAYPAL_CLIENT_SECRET: 'test-secret',
            PAYPAL_PARTNER_MERCHANT_ID: 'test-partner', PAYPAL_PARTNER_ATTRIBUTION_ID: 'test-bn-code',
            PAYPAL_WEBHOOK_ID: 'test-webhook', PAYPAL_FRONTEND_URL: 'http://127.0.0.1:5173'
        });
        assert.deepEqual(paypal.config(), { enabled: true, environment: 'sandbox', currency: 'USD' });
        global.fetch = async (url, options) => {
            calls.push({ url, options });
            return { ok: true, status: 200, json: async () => url.endsWith('/token') ? { access_token: 'test-access' } : { id: 'TEST_ORDER' } };
        };
        await paypal.request('/v2/checkout/orders', { method: 'POST', body: { intent: 'CAPTURE' }, requestId: 'test-request', merchantId: 'test-seller' });
        assert.equal(calls.length, 2);
        assert.ok(calls.every(call => call.url.startsWith('https://api-m.sandbox.paypal.com/')));
        const headers = calls[1].options.headers;
        assert.equal(headers['PayPal-Request-Id'], 'test-request');
        const payload = JSON.parse(Buffer.from(headers['PayPal-Auth-Assertion'].split('.')[1], 'base64url'));
        assert.deepEqual(payload, { iss: 'test-client', payer_id: 'test-seller' });
        process.env.PAYPAL_FRONTEND_URL = 'http://public.example.com';
        assert.throws(paypal.requireConfig, /HTTPS/);
    } finally {
        global.fetch = originalFetch;
        for (const key of keys) {
            if (previous[key] === undefined) delete process.env[key];
            else process.env[key] = previous[key];
        }
    }
});
