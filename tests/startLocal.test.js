const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('local entry point configures the environment before starting the host', () => {
    const script = `
        const Module = require('module');
        const originalLoad = Module._load;
        const calls = [];
        Module._load = function(request, parent, isMain) {
            if (request === './localEnv' && parent.filename.endsWith('startLocal.js')) {
                return () => calls.push('configure');
            }
            if (request === '../app' && parent.filename.endsWith('startLocal.js')) {
                return { start: () => calls.push('start') };
            }
            return originalLoad.apply(this, arguments);
        };
        require(${JSON.stringify(path.join(__dirname, '..', 'scripts', 'startLocal.js'))});
        if (calls.join(',') !== 'configure,start') {
            throw new Error('Unexpected local startup sequence: ' + calls.join(','));
        }
    `;
    const result = spawnSync(process.execPath, ['-e', script], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
});

test('local BuildSudan uses only isolated database and disables mail', () => {
    const script = `
        const assert = require('node:assert/strict');
        const Module = require('module');
        const originalLoad = Module._load;
        Module._load = function(request) {
            if (request === 'dotenv') return { config: () => ({}) };
            return originalLoad.apply(this, arguments);
        };
        process.env.LOCAL_MONGODB_URI = 'mongodb://127.0.0.1:27018/awaab_local_users';
        process.env.LOCAL_BUILDSUDAN_ENABLED = 'true';
        process.env.BUILDSUDAN_MONGODB_URI = 'mongodb://remote.invalid/production';
        process.env.BUILDSUDAN_SMTP_USER = 'remote@example.invalid';
        require(${JSON.stringify(path.join(__dirname, '..', 'scripts', 'localEnv.js'))})();
        assert.equal(process.env.BUILDSUDAN_ENABLED, 'true');
        assert.equal(process.env.BUILDSUDAN_MONGODB_URI, process.env.LOCAL_MONGODB_URI);
        assert.equal(process.env.BUILDSUDAN_DB_NAME, 'buildsudan_local');
        assert.notEqual(process.env.BUILDSUDAN_ADMIN_JWT_SECRET, process.env.JWT_SECRET);
        assert.equal(process.env.BUILDSUDAN_SMTP_USER, '');
        process.env.LOCAL_BUILDSUDAN_ENABLED = 'false';
        require(${JSON.stringify(path.join(__dirname, '..', 'scripts', 'localEnv.js'))})();
        assert.equal(process.env.BUILDSUDAN_ENABLED, 'false');
    `;
    const result = spawnSync(process.execPath, ['-e', script], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
});
