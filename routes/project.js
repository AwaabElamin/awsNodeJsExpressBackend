var express = require('express');
var router = express.Router();
const authorizationController = require('../controllers/auth');
const projectController = require('../controllers/project');
router.post('',projectController.create);
router.get('/:email',projectController.getAllProjects);
module.exports = router;