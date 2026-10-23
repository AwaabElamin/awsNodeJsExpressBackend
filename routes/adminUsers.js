const express = require('express');
const router = express.Router();
const authorizationController = require('../controllers/auth');
const requireAdmin = require('../middleware/requireAdmin');
const adminUsersController = require('../controllers/adminUsers');

router.use(authorizationController.authorize, requireAdmin);
router.get('/', adminUsersController.listUsers);
router.post('/', adminUsersController.createClient);
router.get('/conversations/:platform/:conversationId', adminUsersController.getConversation);
router.delete('/conversations/:platform/:conversationId', adminUsersController.deleteConversation);
router.get('/:id', adminUsersController.getAccountOverview);
router.patch('/:id', adminUsersController.updateClient);
router.patch('/:id/status', adminUsersController.setAccountStatus);
router.post('/:id/warnings', adminUsersController.addWarning);
router.delete('/:id/warnings/:warningId', adminUsersController.removeWarning);
router.delete('/:id', adminUsersController.deleteClient);

module.exports = router;