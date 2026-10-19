const express = require('express');
const router = express.Router();
const authorizationController = require('../controllers/auth');
const clientBriefsController = require('../controllers/clientBriefs');
const requireAdmin = require('../middleware/requireAdmin');

router.post('/', clientBriefsController.submit);
router.get('/', authorizationController.authorize, requireAdmin, clientBriefsController.list);

module.exports = router;