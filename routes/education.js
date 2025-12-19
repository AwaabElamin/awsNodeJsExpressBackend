const express = require('express');
const router = express.Router();
const authorizationController = require('../controllers/auth');
const educationController = require('../controllers/education');

// Create education for authenticated user
router.post('/', authorizationController.authorize, educationController.createEducation);
// Get all educations for authenticated user
router.get('/', authorizationController.authorize, educationController.getEducationsByUser);

module.exports = router;
