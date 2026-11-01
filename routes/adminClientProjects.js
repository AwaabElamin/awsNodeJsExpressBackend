const express = require('express');
const router = express.Router();
const authorizationController = require('../controllers/auth');
const requireAdmin = require('../middleware/requireAdmin');
const adminClientProjectsController = require('../controllers/adminClientProjects');

router.use(authorizationController.authorize, requireAdmin);
router.get('/', adminClientProjectsController.list);
router.get('/:id', adminClientProjectsController.get);
router.patch('/:id', adminClientProjectsController.update);
router.post('/:id/plan', adminClientProjectsController.regeneratePlan);
router.patch('/:id/requests/:requestId', adminClientProjectsController.updateRequest);

module.exports = router;
