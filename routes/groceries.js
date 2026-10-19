const express = require('express');
const router = express.Router();
const groceries = require('../controllers/groceries');
const requireAutoUser = require('../middleware/requireAutoUser');
const requirePlatform = require('../middleware/requirePlatform');
const requireGroceryPlatform = requirePlatform('groceries');

router.post('/user', requireAutoUser, groceries.provisionUser);
router.get('/user', requireAutoUser, groceries.getUser);

router.get('/products/viewAll', groceries.listPublic);
router.get('/products', requireAutoUser, requireGroceryPlatform, groceries.listMine);
router.post('/products', requireAutoUser, requireGroceryPlatform, groceries.create);
router.post('/products/edit', requireAutoUser, requireGroceryPlatform, groceries.update);
router.post('/products/delete', requireAutoUser, requireGroceryPlatform, groceries.remove);

module.exports = router;
