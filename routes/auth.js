const express = require('express');
const router = express.Router();
const authorizeController = require('../controllers/auth');
router.post('/login',authorizeController.login);

module.exports = router;