const express = require('express');
const router = express.Router();
const auto = require('../controllers/auto');
const usedCars = require('../controllers/autoUsedCars');
const requireAutoUser = require('../middleware/requireAutoUser');

router.post('/user', requireAutoUser, auto.provisionUser);
router.get('/user', requireAutoUser, auto.getAutoUser);

router.get('/usedCars/viewAll', usedCars.listPublic);
router.get('/usedCars', requireAutoUser, usedCars.listMine);
router.post('/usedCars', requireAutoUser, usedCars.add);
router.post('/usedCars/edit', requireAutoUser, usedCars.edit);
router.post('/usedCars/delete', requireAutoUser, usedCars.remove);

module.exports = router;