const router = require('express').Router();
const { rateLimit } = require('express-rate-limit');
const auth = require('../middleware/requireAutoUser');
const payments = require('../controllers/payments');
const limit = rateLimit({ windowMs: 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false,
    message: { status: 'fail', message: 'Too many payment requests. Please try again shortly.' } });
router.get('/config', payments.config);
router.post('/webhook', payments.webhook);
router.use(auth);
router.get('/history', payments.history);
router.get('/seller', payments.sellerStatus);
router.post('/seller/onboard', limit, payments.onboard);
router.post('/seller/refresh', limit, payments.refreshSeller);
router.post('/orders', limit, payments.create);
router.post('/capture', limit, payments.capture);
router.post('/:id/refresh', limit, payments.refresh);
module.exports = router;
