var express = require('express');
var router = express.Router();
const mainMainController = require('../controllers/mainMain');
router.get('',mainMainController.getProjects);
router.post('',mainMainController.create);
module.exports = router;