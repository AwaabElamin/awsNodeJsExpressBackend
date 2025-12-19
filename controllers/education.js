// controllers/education.js
const Education = require('../models/education');

exports.createEducation = async (req, res) => {
    if (!req.user || !req.user.email) {
        return res.status(401).json({ status: 'fail', message: 'Unauthenticated' });
    }
    const { universityName, degreeType, majorName, yearOfGraduate } = req.body;
    if (!universityName) {
        return res.status(400).json({ status: 'fail', message: 'University name is required' });
    }
    try {
        const education = new Education({
            email: req.user.email,
            universityName,
            degreeType,
            majorName,
            yearOfGraduate
        });
        await education.save();
        return res.status(201).json({ status: 'success', data: education });
    } catch (error) {
        return res.status(500).json({ status: 'error', data: error.message });
    }
};

exports.getEducationsByUser = async (req, res) => {
    console.log('req.user:', req.user);
    if (!req.user || !req.user.email) {
        return res.status(401).json({ status: 'fail', message: 'Unauthenticated' });
    }
    try {
        const educations = await Education.find({ email: req.user.email });
        return res.status(200).json({ status: 'success', data: educations });
    } catch (error) {
        console.error('Error fetching educations:', error);
        return res.status(500).json({ status: 'error', data: error.message });
    }
};

// Update education by ID for authenticated user
const mongoose = require('mongoose');
exports.updateEducation = async (req, res) => {
    if (!req.user || !req.user.email) {
        return res.status(401).json({ status: 'fail', message: 'Unauthenticated' });
    }
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ status: 'fail', message: 'Invalid or missing education ID' });
    }
    const { universityName, degreeType, majorName, yearOfGraduate } = req.body;
    // Only update provided fields (partial update)
    const updateFields = {};
    if (universityName !== undefined) updateFields.universityName = universityName;
    if (degreeType !== undefined) updateFields.degreeType = degreeType;
    if (majorName !== undefined) updateFields.majorName = majorName;
    if (yearOfGraduate !== undefined) updateFields.yearOfGraduate = yearOfGraduate;
    if (Object.keys(updateFields).length === 0) {
        return res.status(400).json({ status: 'fail', message: 'No fields provided for update' });
    }
    try {
        const education = await Education.findOneAndUpdate(
            { _id: id, email: req.user.email },
            updateFields,
            { new: true, runValidators: true }
        );
        if (!education) {
            return res.status(404).json({ status: 'fail', message: 'Education not found or not owned by user' });
        }
        return res.status(200).json({ status: 'success', data: education });
    } catch (error) {
        // Log error for diagnostics, but don't leak stack traces in production
        console.error('Error updating education:', error);
        return res.status(500).json({ status: 'error', data: 'Internal server error' });
    }
};
