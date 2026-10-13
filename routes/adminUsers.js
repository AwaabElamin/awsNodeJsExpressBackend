const express = require('express');
const router = express.Router();
const authorizationController = require('../controllers/auth');
const requireAdmin = require('../middleware/requireAdmin');
const adminUsersController = require('../controllers/adminUsers');

router.use(authorizationController.authorize, requireAdmin);
router.get('/', adminUsersController.listUsers);
router.post('/', adminUsersController.createClient);
router.patch('/:id', adminUsersController.updateClient);
router.delete('/:id', adminUsersController.deleteClient);

module.exports = router;