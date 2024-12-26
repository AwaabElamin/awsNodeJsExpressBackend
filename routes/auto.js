const express = require('express');
const router = express.Router();
const auto = require('../controllers/auto');
router.get('/user/:email',auto.getAutoUser);
module.exports = router;