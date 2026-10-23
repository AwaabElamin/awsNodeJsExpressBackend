const JwtManager = require('../jwt/jwtManager');
const bcrypt = require('bcrypt');
const userModel = require('../models/users');
const DEACTIVATED_MESSAGE = 'Your account has been deactivated by Awaaab LLC. Contact support if you believe this is a mistake.';
exports.DEACTIVATED_MESSAGE = DEACTIVATED_MESSAGE;
exports.login = async (req, res) => {
    const loginId = req.body?.email || req.body?.username || req.body?.loginId;
    const { password } = req.body || {};

    if (loginId && password) {
        try {
            const userFound = await userModel.findByLoginId(loginId);
            if (userFound) {  
                if (userFound.emailVerified === false) {
                    return res.status(403).json({ status: 'fail', message: 'Please confirm your email address before signing in.' });
                }
                if (userFound.isActive === false) {
                    return res.status(403).json({ status: 'fail', code: 'ACCOUNT_DEACTIVATED', message: DEACTIVATED_MESSAGE });
                }
                if (bcrypt.compareSync(password, userFound.password)) {
                    const data = { email: userFound.email };
                    const jwt = new JwtManager();
                    const token = jwt.generate(data);
                    res.json({ status: 'success', accessToken: token, email: userFound.email, _id: userFound._id, role: userFound.role || 'Client' });
                } else {
                    res.send({ status: 'fail', message: 'Wrong password' });
                }
            } else {
                // console.log('Awaab', userFound);
                res.send({ status: 'fail', message: 'The user is not found' });
            }
        }
        catch (error) {
            console.error('Login failed', error.message);
            res.status(500).send({ status: 'error', message: 'Unable to sign in' });
        }
    } else {
        res.status(400).send({ status: 'fail', data: 'Please provide a username or email and password' });
    }


}
exports.authorize = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        console.log('No Authorization header');
        return res.status(401).json({ status: 'fail', message: 'no Authorization' });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({ status: 'fail', message: 'Invalid Authorization format' });
    }

    const token = parts[1];
    const jwt = new JwtManager();
    let data;
    try {
        data = jwt.verify(token);
        if (!data || data.autoHub === true) {
            return res.status(401).json({ status: 'fail', message: 'Unauthenticated' });
        }
    } catch (err) {
        console.log('Token verification error', err);
        return res.status(401).json({ status: 'fail', message: 'Unauthenticated' });
    }

    // Existing tokens stop working as soon as an Admin deactivates the account.
    try {
        if (typeof data.email === 'string') {
            const account = await userModel.findByEmail(data.email.trim().toLowerCase());
            if (account && account.isActive === false) {
                return res.status(403).json({ status: 'fail', code: 'ACCOUNT_DEACTIVATED', message: DEACTIVATED_MESSAGE });
            }
        }
    } catch (err) {
        return next(err);
    }
    // attach verified data to request for downstream handlers
    req.user = data;
    return next();
}