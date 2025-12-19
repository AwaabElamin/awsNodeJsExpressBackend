const express = require('express');
const router = express.Router();
const authorizationController = require('../controllers/auth');
const educationController = require('../controllers/education');

// Create education for authenticated user
router.post('/', authorizationController.authorize, educationController.createEducation);
// Get all educations for authenticated user
router.get('/', authorizationController.authorize, educationController.getEducationsByUser);
// Update education by ID for authenticated user
router.put('/:id', authorizationController.authorize, educationController.updateEducation);
// Delete education by ID for authenticated user
router.delete('/:id', authorizationController.authorize, educationController.deleteEducation);

module.exports = router;
