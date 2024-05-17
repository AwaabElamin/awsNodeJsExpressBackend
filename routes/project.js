var express = require('express');
var router = express.Router();
const authorizationController = require('../controllers/auth');
const projectController = require('../controllers/project');
router.post('',projectController.create);
module.exports = router;