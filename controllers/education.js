// controllers/education.js
const Education = require('../models/education');

exports.createEducation = async (req, res) => {
    if (!req.user || !req.user._id) {
        return res.status(401).json({ status: 'fail', message: 'Unauthenticated' });
    }
    const { universityName, degreeType, majorName, yearOfGraduate } = req.body;
    if (!universityName) {
        return res.status(400).json({ status: 'fail', message: 'University name is required' });
    }
    try {
        const education = new Education({
            user: req.user._id,
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
