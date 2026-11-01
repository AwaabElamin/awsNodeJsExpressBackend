const usersModel = require('../models/users');

// Project requests belong to Awaaab LLC Clients. Visitors must create a workspace first.
module.exports = async (req, res, next) => {
    if (!req.user || !req.user.email) {
        return res.status(401).json({ status: 'fail', message: 'Authentication required' });
    }

    try {
        const user = await usersModel.findByEmail(String(req.user.email).trim().toLowerCase());
        if (!user) {
            return res.status(401).json({ status: 'fail', message: 'Authentication required' });
        }
        if (String(user.role || '').trim() !== 'Client') {
            return res.status(403).json({
                status: 'fail',
                code: 'CLIENT_ROLE_REQUIRED',
                message: 'Create a workspace to request projects from Awaaab LLC.'
            });
        }
        req.client = { _id: user._id, email: user.email, firstname: user.firstname, lastname: user.lastname };
        return next();
    } catch (error) {
        return next(error);
    }
};
