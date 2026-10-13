const ClientBrief = require('../models/clientBrief');

const MAX_FIELDS = 60;
const MAX_VALUE_LENGTH = 5000;

function normalizeResponses(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const entries = Object.entries(value);
    if (entries.length > MAX_FIELDS) return null;

    const responses = {};
    for (const [key, answer] of entries) {
        if (!key.trim() || key.length > 100) return null;
        if (typeof answer === 'string' && answer.length <= MAX_VALUE_LENGTH) {
            responses[key] = answer.trim();
        } else if (Array.isArray(answer) && answer.every((item) => typeof item === 'string' && item.length <= 200)) {
            responses[key] = answer.map((item) => item.trim());
        } else {
            return null;
        }
    }
    return responses;
}

exports.submit = async (req, res, next) => {
    const responses = normalizeResponses(req.body?.responses);
    if (!responses) {
        return res.status(400).json({ status: 'fail', message: 'Invalid project brief responses' });
    }

    const clientName = responses['Your name'];
    const clientEmail = responses['Email address'];
    const projectName = responses['Project name'];
    const projectIdea = responses['Project idea'];
    if (!clientName || !clientEmail || !projectName || !projectIdea ||
        typeof clientName !== 'string' || typeof clientEmail !== 'string' ||
        typeof projectName !== 'string' || typeof projectIdea !== 'string' ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
        return res.status(400).json({ status: 'fail', message: 'Name, valid email, project name, and project description are required' });
    }

    try {
        const brief = await ClientBrief.create({
            clientName,
            clientEmail,
            company: typeof responses['Company or organization'] === 'string' ? responses['Company or organization'] : '',
            projectName,
            projectType: typeof responses['Project type'] === 'string' ? responses['Project type'] : '',
            responses
        });
        return res.status(201).json({ status: 'success', message: 'Project brief received', id: brief._id });
    } catch (error) {
        return next(error);
    }
};

exports.list = async (req, res, next) => {
    try {
        const briefs = await ClientBrief.find({}).sort({ createdAt: -1 }).lean();
        return res.json({ status: 'success', data: briefs });
    } catch (error) {
        return next(error);
    }
};