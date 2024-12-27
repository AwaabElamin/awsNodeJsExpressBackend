const express = require('express');
const router = express.Router();
const auto = require('../controllers/auto');
router.get('/user/:email',auto.getAutoUser);
router.post('/user',auto.addAutoUser);
module.exports = router;