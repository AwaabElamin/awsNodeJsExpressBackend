const usersModel = require('../models/users');

module.exports = async (req, res, next) => {
    if (!req.user || !req.user.email) {
        return res.status(401).json({ status: 'fail', message: 'Authentication required' });
    }

    try {
        const user = await usersModel.findByEmail(req.user.email);
        if (!user || String(user.role || '').trim().toLowerCase() !== 'admin') {
            return res.status(403).json({ status: 'fail', message: 'Admin role required' });
        }
        req.admin = { email: user.email, role: user.role };
        return next();
    } catch (error) {
        return next(error);
    }
};