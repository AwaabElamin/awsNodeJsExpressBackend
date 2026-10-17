const users = require('../models/users');

exports.provisionUser = async (req, res, next) => {
    try {
        if (!req.account) {
            return res.status(403).json({ status: 'fail', message: 'An Awaaab account is required.' });
        }

        const user = await users.enablePlatform(req.autoUser.email, 'auto');
        if (!user) {
            return res.status(404).json({ status: 'fail', message: 'A verified Awaaab account is required.' });
        }

        return res.json({
            status: 'success',
            data: {
                _id: user._id,
                email: user.email,
                firstname: user.firstname || '',
                lastname: user.lastname || '',
                userRole: user.role === 'Admin' ? 'Admin' : 'Employee',
                status: user.emailVerified === false ? 0 : 1
            }
        });
    } catch (error) {
        return next(error);
    }
};

exports.getAutoUser = async (req, res, next) => {
    try {
        const user = req.account;
        if (!user || !user.platforms.includes('auto')) {
            return res.status(404).json({ status: 'fail', message: 'Account not found.' });
        }
        return res.json({
            status: 'success',
            data: {
                _id: user._id,
                email: user.email,
                firstname: user.firstname || '',
                lastname: user.lastname || '',
                userRole: user.role === 'Admin' ? 'Admin' : 'Employee',
                status: user.emailVerified === false ? 0 : 1
            }
        });
    } catch (error) {
        return next(error);
    }
};