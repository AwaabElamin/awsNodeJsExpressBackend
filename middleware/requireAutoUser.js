const JwtManager = require('../jwt/jwtManager');
const users = require('../models/users');
const { DEACTIVATED_MESSAGE } = require('../controllers/auth');

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
        if (account.isActive === false) {
            return res.status(403).json({ status: 'fail', code: 'ACCOUNT_DEACTIVATED', message: DEACTIVATED_MESSAGE });
        }
        req.account = {
            _id: account._id,
            email,
            firstName: account.firstname,
            lastName: account.lastname,
            firstname: account.firstname,
            lastname: account.lastname,
            phone: account.phone,
            role: account.role,
            platforms: Array.isArray(account.platforms) ? account.platforms : [],
            emailVerified: account.emailVerified
        };
        req.autoUser = { id: account._id, email };
        return next();
    } catch (error) {
        return next(error);
    }
};