const assert = require('node:assert/strict');
const { test } = require('node:test');

const modelPath = require.resolve('../models/autoUsedCar');
const originalModel = require.cache[modelPath];
const calls = [];
const model = {
    addCar: async (data, ownerId, email) => {
        calls.push({ data, ownerId, email });
        return { toObject: () => ({ ...data, ownerId, email }) };
    },
    updateCar: async (id, ownerId, email, data) => {
        calls.push({ id, data, ownerId, email });
        return { ...data, ownerId, email };
    }
};
require.cache[modelPath] = { id: modelPath, filename: modelPath, loaded: true, exports: model };
const controller = require('../controllers/autoUsedCars');
if (originalModel) require.cache[modelPath] = originalModel;
else delete require.cache[modelPath];

function response() {
    return {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; }
    };
}

for (const action of ['add', 'edit']) {
    test(`${action} rejects missing, blank, non-string, or oversized locations before writing`, async () => {
        for (const body of [
            undefined, {}, { country: '', state: 'Dubai' },
            { country: 'Saudi Arabia', state: '   ' },
            { country: 123, state: 'Riyadh' },
            { country: 'United Arab Emirates', state: {} },
            { country: 'x'.repeat(101), state: 'Dubai' },
            { country: 'Saudi Arabia', state: 'x'.repeat(101) }
        ]) {
            const res = response();
            calls.length = 0;
            await controller[action]({ body, autoUser: { id: 'owner', email: 'owner@example.invalid' } }, res, assert.ifError);
            assert.equal(res.statusCode, 400);
            assert.match(res.body.message, /Country and state\/region/);
            assert.equal(calls.length, 0);
        }
    });

    test(`${action} accepts location and preserves authenticated ownership`, async () => {
        const res = response();
        calls.length = 0;
        const body = { _id: 'vehicle', country: 'Saudi Arabia', state: 'Riyadh', ownerId: 'untrusted' };
        await controller[action]({
            body, autoUser: { id: 'authenticated-owner', email: 'owner@example.invalid' }
        }, res, assert.ifError);
        assert.equal(res.statusCode, action === 'add' ? 201 : 200);
        assert.equal(calls[0].ownerId, 'authenticated-owner');
        assert.equal(res.body.data.country, 'Saudi Arabia');
        assert.equal(res.body.data.state, 'Riyadh');
        assert.equal(res.body.data.ownerId, undefined);
        assert.equal(res.body.data.email, undefined);
    });
}
