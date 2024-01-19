var express = require('express');
var router = express.Router();
const resumeController = require('../controllers/resume');
/* GET home page. */
router.get('/', resumeController.getAll);
module.exports = router;