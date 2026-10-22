const express = require('express');
const router = express.Router();
const groceries = require('../controllers/groceries');
const requireAutoUser = require('../middleware/requireAutoUser');
const requirePlatform = require('../middleware/requirePlatform');
const requireGroceryPlatform = requirePlatform('groceries');
const messages = require('../controllers/groceryMessages');
const limitMessages = require('../middleware/limitAutoConversationStarts');
const limitChatMessages = require('../middleware/limitAutoMessages');

router.post('/user', requireAutoUser, groceries.provisionUser);
router.get('/user', requireAutoUser, groceries.getUser);

router.get('/products/viewAll', groceries.listPublic);
router.get('/products', requireAutoUser, requireGroceryPlatform, groceries.listMine);
router.post('/products', requireAutoUser, requireGroceryPlatform, groceries.create);
router.post('/products/edit', requireAutoUser, requireGroceryPlatform, groceries.update);
router.post('/products/delete', requireAutoUser, requireGroceryPlatform, groceries.remove);
router.post('/conversations', requireAutoUser, limitMessages, messages.create);
router.get('/conversations', requireAutoUser, messages.listForVisitor);
router.get('/conversations/:id', requireAutoUser, messages.getForVisitor);
router.post('/conversations/:id/messages', requireAutoUser, limitChatMessages, messages.replyAsVisitor);
router.get('/messages/inbox', requireAutoUser, requireGroceryPlatform, messages.list);
router.get('/messages/inbox/:id', requireAutoUser, requireGroceryPlatform, messages.get);
router.post('/messages/inbox/:id/reply', requireAutoUser, requireGroceryPlatform, limitChatMessages, messages.replyAsOwner);

module.exports = router;
