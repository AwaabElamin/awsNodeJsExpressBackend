const express = require('express');
const router = express.Router();
const authorizationController = require('../controllers/auth');
const requireClient = require('../middleware/requireClient');
const clientProjectsController = require('../controllers/clientProjects');

router.get('/options', clientProjectsController.options);
router.use(authorizationController.authorize, requireClient);
router.get('/', clientProjectsController.listMine);
router.post('/', clientProjectsController.create);
router.get('/:id', clientProjectsController.getMine);
router.patch('/:id', clientProjectsController.updateMine);
router.post('/:id/plan/decision', clientProjectsController.decidePlan);
router.post('/:id/requests', clientProjectsController.addRequest);
router.patch('/:id/requests/:requestId', clientProjectsController.updateMyRequest);

module.exports = router;
