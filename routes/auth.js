const express = require('express');
const router = express.Router();
const autherizeController = require('../controllers/auth');router.post('/login',autherizeController.login);

module.exports = router;