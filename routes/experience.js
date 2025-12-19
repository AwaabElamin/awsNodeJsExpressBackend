const express = require('express');
const router = express.Router();
const authorizationController = require('../controllers/auth');
const experienceController = require('../controllers/experience');


// Create experience for authenticated user
router.post('/', authorizationController.authorize, experienceController.createExperience);
// Get all experiences for authenticated user
router.get('/', authorizationController.authorize, experienceController.getExperiencesByUser);
// Update experience by ID for authenticated user
router.put('/:id', authorizationController.authorize, experienceController.updateExperience);
// Delete experience by ID for authenticated user
router.delete('/:id', authorizationController.authorize, experienceController.deleteExperience);

module.exports = router;
