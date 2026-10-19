var express = require('express');
var router = express.Router();
const JwtManager = require('../jwt/jwtManager');
const authorizationController = require('../controllers/auth');
const usersController = require('../controllers/users');
const { rateLimit } = require('express-rate-limit');

const passwordResetRequestLimit = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 5,
	standardHeaders: true,
	legacyHeaders: false,
	message: { status: 'fail', message: 'Too many reset requests. Please try again later.' }
});

const passwordResetConfirmLimit = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 10,
	standardHeaders: true,
	legacyHeaders: false,
	message: { status: 'fail', message: 'Too many reset attempts. Please try again later.' }
});

/* GET users listing. */
router.get('',authorizationController.authorize,usersController.getAll);
router.post('',usersController.create);
router.get('/verify-email', usersController.verifyEmail);
router.post('/login', authorizationController.login);
router.post('/forgot-password', passwordResetRequestLimit, usersController.requestPasswordReset);
router.post('/reset-password', passwordResetConfirmLimit, usersController.resetPassword);
router.post('/userInfo',authorizationController.authorize,usersController.getUserByEmail);
// Education and Experience routes are now handled in their own files.

module.exports = router;
