const JwtManager = require('../jwt/jwtManager');
const users = require('../models/users');

module.exports = async (req, res, next) => {
    const parts = String(req.headers.authorization || '').split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
        return res.status(401).json({ status: 'fail', message: 'Authentication required.' });
    }

    const payload = new JwtManager().verify(parts[1]);
    if (!payload || typeof payload.email !== 'string') {
        return res.status(401).json({ status: 'fail', message: 'Unauthenticated.' });
    }

    try {
        const email = payload.email.trim().toLowerCase();
        if (payload.autoHub === true) {
            return res.status(401).json({ status: 'fail', message: 'Unauthenticated.' });
        }

        const account = await users.findByEmail(email);
        if (!account || account.emailVerified === false) {
            return res.status(401).json({ status: 'fail', message: 'Unauthenticated.' });
        }
        req.autoUser = { email };
        req.account = {
            email,
            firstName: account.firstname,
            lastName: account.lastname
        };
        return next();
    } catch (error) {
        return next(error);
    }
};