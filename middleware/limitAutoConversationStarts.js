const { rateLimit } = require('express-rate-limit');

module.exports = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 3,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 'fail', message: 'Too many new conversations. Please try again later.' }
});
