const express = require('express');
const router = express.Router();
const authorizationController = require('../controllers/auth');
const clientBriefsController = require('../controllers/clientBriefs');
const requireAdmin = require('../middleware/requireAdmin');

// The public submission endpoint was retired; project requests now come from the Client workspace (/client-projects).
router.use(authorizationController.authorize, requireAdmin);
router.get('/', clientBriefsController.list);
router.post('/:id/convert', clientBriefsController.convert);

module.exports = router;