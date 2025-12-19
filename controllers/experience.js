// controllers/experience.js
const Experience = require('../models/experience');

exports.createExperience = async (req, res) => {
    if (!req.user || !req.user._id) {
        return res.status(401).json({ status: 'fail', message: 'Unauthenticated' });
    }
    const { companyName, startYear, positionName, endYear, projectName, summary, link, TechnologiesUsed } = req.body;
    if (!companyName) {
        return res.status(400).json({ status: 'fail', message: 'Company name is required' });
    }
    try {
        const experience = new Experience({
            user: req.user._id,
            companyName,
            startYear,
            positionName,
            endYear,
            projectName,
            summary,
            link,
            TechnologiesUsed
        });
        await experience.save();
        return res.status(201).json({ status: 'success', data: experience });
    } catch (error) {
        return res.status(500).json({ status: 'error', data: error.message });
    }
};

exports.getExperiencesByUser = async (req, res) => {
    if (!req.user || !req.user._id) {
        return res.status(401).json({ status: 'fail', message: 'Unauthenticated' });
    }
    try {
        const experiences = await Experience.find({ user: req.user._id });
        return res.status(200).json({ status: 'success', data: experiences });
    } catch (error) {
        return res.status(500).json({ status: 'error', data: error.message });
    }
};

// Update experience by ID for authenticated user
const mongoose = require('mongoose');
exports.updateExperience = async (req, res) => {
    if (!req.user || !req.user._id) {
        return res.status(401).json({ status: 'fail', message: 'Unauthenticated' });
    }
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ status: 'fail', message: 'Invalid or missing experience ID' });
    }
    const { companyName, startYear, positionName, endYear, projectName, summary, link, TechnologiesUsed } = req.body;
    const updateFields = {};
    if (companyName !== undefined) updateFields.companyName = companyName;
    if (startYear !== undefined) updateFields.startYear = startYear;
    if (positionName !== undefined) updateFields.positionName = positionName;
    if (endYear !== undefined) updateFields.endYear = endYear;
    if (projectName !== undefined) updateFields.projectName = projectName;
    if (summary !== undefined) updateFields.summary = summary;
    if (link !== undefined) updateFields.link = link;
    if (TechnologiesUsed !== undefined) updateFields.TechnologiesUsed = TechnologiesUsed;
    if (Object.keys(updateFields).length === 0) {
        return res.status(400).json({ status: 'fail', message: 'No fields provided for update' });
    }
    try {
        const experience = await Experience.findOneAndUpdate(
            { _id: id, user: req.user._id },
            updateFields,
            { new: true, runValidators: true }
        );
        if (!experience) {
            return res.status(404).json({ status: 'fail', message: 'Experience not found or not owned by user' });
        }
        return res.status(200).json({ status: 'success', data: experience });
    } catch (error) {
        console.error('Error updating experience:', error);
        return res.status(500).json({ status: 'error', data: 'Internal server error' });
    }
};

// Delete experience by ID for authenticated user
exports.deleteExperience = async (req, res) => {
    if (!req.user || !req.user._id) {
        return res.status(401).json({ status: 'fail', message: 'Unauthenticated' });
    }
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ status: 'fail', message: 'Invalid or missing experience ID' });
    }
    try {
        const experience = await Experience.findOneAndDelete({ _id: id, user: req.user._id });
        if (!experience) {
            return res.status(404).json({ status: 'fail', message: 'Experience not found or not owned by user' });
        }
        return res.status(200).json({ status: 'success', message: 'Experience deleted successfully' });
    } catch (error) {
        console.error('Error deleting experience:', error);
        return res.status(500).json({ status: 'error', data: 'Internal server error' });
    }
};
