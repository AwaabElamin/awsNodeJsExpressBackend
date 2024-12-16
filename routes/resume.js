var express = require('express');
var router = express.Router();
const resumeController = require('../controllers/resume');
/* GET home page. */
router.get('/', resumeController.getAll);
router.get('/educations', resumeController.getEducations);
router.get('/experience', resumeController.getExperience);
router.get('/summary', resumeController.getSummary);
module.exports = router;