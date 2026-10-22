const express = require('express');
const router = express.Router();
const auto = require('../controllers/auto');
const autoPhotos = require('../controllers/autoPhotos');
const usedCars = require('../controllers/autoUsedCars');
const messages = require('../controllers/autoMessages');
const requireAutoUser = require('../middleware/requireAutoUser');
const requirePlatform = require('../middleware/requirePlatform');
const limitAutoMessages = require('../middleware/limitAutoMessages');
const limitAutoConversationStarts = require('../middleware/limitAutoConversationStarts');
const requireAutoPlatform = requirePlatform('auto');

router.post('/user', requireAutoUser, auto.provisionUser);
router.get('/user', requireAutoUser, auto.getAutoUser);

router.get('/usedCars/viewAll', usedCars.listPublic);
router.get('/usedCars', requireAutoUser, requireAutoPlatform, usedCars.listMine);
router.post('/usedCars/photo-upload-url', requireAutoUser, requireAutoPlatform, autoPhotos.createUploadUrl);
router.post('/usedCars', requireAutoUser, requireAutoPlatform, usedCars.add);
router.post('/usedCars/edit', requireAutoUser, requireAutoPlatform, usedCars.edit);
router.post('/usedCars/delete', requireAutoUser, requireAutoPlatform, usedCars.remove);

router.post('/conversations', requireAutoUser, limitAutoConversationStarts, messages.startConversation);
router.get('/conversations', requireAutoUser, messages.listForVisitor);
router.get('/conversations/:id', requireAutoUser, messages.getForVisitor);
router.post('/conversations/:id/messages', requireAutoUser, limitAutoMessages, messages.replyAsVisitor);

router.get('/messages/inbox', requireAutoUser, requireAutoPlatform, messages.listForOwner);
router.get('/messages/inbox/:id', requireAutoUser, requireAutoPlatform, messages.getForOwner);
router.post('/messages/inbox/:id/reply', requireAutoUser, requireAutoPlatform, limitAutoMessages, messages.replyAsOwner);

module.exports = router;