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
