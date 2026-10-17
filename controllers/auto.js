const auto = require('../models/auto');

exports.provisionUser = async (req, res, next) => {
    try {
        if (!req.account) {
            return res.status(403).json({ status: 'fail', message: 'An Awaaab account is required.' });
        }

        let user = await auto.getUserInfo(req.autoUser.email);
        if (!user) {
            user = await auto.addNewUser({
                email: req.autoUser.email,
                firstName: req.account.firstName,
                lastName: req.account.lastName
            });
        }

        return res.status(201).json({
            status: 'success',
            data: {
                _id: user._id,
                email: user.email,
                firstname: user.firstname || user.firstName,
                lastname: user.lastname || user.lastName,
                userRole: user.userRole || 'Employee',
                status: user.status || 1
            }
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ status: 'fail', message: 'An AutoHub account already exists.' });
        }
        return next(error);
    }
};

exports.getAutoUser = async (req, res, next) => {
    try {
        const user = await auto.getUserInfo(req.autoUser.email);
        if (!user) {
            return res.status(404).json({ status: 'fail', message: 'Account not found.' });
        }
        return res.json({
            status: 'success',
            data: {
                _id: user._id,
                email: user.email,
                firstname: user.firstname || user.firstName || '',
                lastname: user.lastname || user.lastName || '',
                userRole: user.userRole || 'Employee',
                status: user.status || 1
            }
        });
    } catch (error) {
        return next(error);
    }
};