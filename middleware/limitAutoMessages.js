const { rateLimit } = require('express-rate-limit');

module.exports = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 'fail', message: 'Too many messages. Please try again later.' }
});
