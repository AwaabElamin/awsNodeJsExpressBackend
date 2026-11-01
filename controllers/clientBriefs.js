const mongoose = require('mongoose');
const ClientBrief = require('../models/clientBrief');
const clientProjects = require('../models/clientProject');
const usersModel = require('../models/users');
const { validateProjectInput } = require('../lib/clientProjectInput');
const { INTEGRATIONS } = require('../lib/clientProjectOptions');

// Legacy public briefs stored answers under their on-screen labels; map them onto project profile fields.
const LABEL_TO_FIELD = {
    'Project name': 'name',
    'Project type': 'type',
    'Project idea': 'summary',
    'Problem or opportunity': 'problem',
    'Desired outcome': 'outcome',
    'Audience': 'audience',
    'Typical user tasks': 'userTasks',
    'References': 'references',
    'Must-have features': 'mustHaves',
    'Future or optional features': 'futureFeatures',
    'Integration details': 'integrationDetails',
    'Content and materials': 'contentMaterials',
    'Ideal launch or completion date': 'targetDate',
    'Timeline flexibility': 'timelineFlexibility',
    'Estimated budget': 'budgetRange',
    'Reviewers and decision-makers': 'reviewers',
    'Other details or constraints': 'otherDetails'
};

function briefToProjectInput(brief) {
    const responses = brief.responses && typeof brief.responses === 'object' ? brief.responses : {};
    const input = {};
    for (const [label, field] of Object.entries(LABEL_TO_FIELD)) {
        const value = responses[label];
        if (typeof value === 'string' && value.trim()) input[field] = value;
    }
    const integrations = responses['Integrations'];
    const list = Array.isArray(integrations) ? integrations : typeof integrations === 'string' && integrations ? [integrations] : [];
    input.integrations = list.filter((item) => INTEGRATIONS.includes(item));

    input.name = input.name || brief.projectName;
    input.summary = input.summary || responses['Project idea'] || '';

    const contact = [
        `Submitted through the public project brief on ${new Date(brief.createdAt).toISOString().slice(0, 10)}.`,
        `Name: ${brief.clientName}`,
        brief.company ? `Company: ${brief.company}` : '',
        typeof responses['Phone number'] === 'string' && responses['Phone number'] ? `Phone: ${responses['Phone number']}` : '',
        typeof responses['Your role in the project'] === 'string' && responses['Your role in the project'] ? `Role: ${responses['Your role in the project']}` : ''
    ].filter(Boolean).join('\n');
    input.otherDetails = [input.otherDetails, contact].filter(Boolean).join('\n\n');
    return input;
}

exports.list = async (req, res, next) => {
    try {
        const briefs = await ClientBrief.listForAdmin();
        return res.json({ status: 'success', data: briefs });
    } catch (error) {
        return next(error);
    }
};

exports.convert = async (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(404).json({ status: 'fail', message: 'Project brief not found.' });
    }
    const { ownerId } = req.body || {};
    if (ownerId !== undefined && !mongoose.isValidObjectId(ownerId)) {
        return res.status(400).json({ status: 'fail', message: 'ownerId is not valid.' });
    }

    try {
        const brief = await ClientBrief.getForAdmin(req.params.id);
        if (!brief) return res.status(404).json({ status: 'fail', message: 'Project brief not found.' });
        if (brief.status === 'converted' || brief.projectId) {
            return res.status(409).json({ status: 'fail', message: 'This brief has already been converted.', projectId: brief.projectId });
        }

        const owner = ownerId
            ? await usersModel.getManagedAccountForAdmin(ownerId)
            : await usersModel.findByEmail(String(brief.clientEmail || '').trim().toLowerCase());
        if (!owner || owner.role !== 'Client') {
            return res.status(422).json({
                status: 'fail',
                code: 'CLIENT_ACCOUNT_REQUIRED',
                message: `No Client account matches ${brief.clientEmail}. Create the client account first, or choose an existing client.`
            });
        }

        const { fields, error } = validateProjectInput(briefToProjectInput(brief));
        if (error) return res.status(422).json({ status: 'fail', message: `The brief could not be converted: ${error}` });

        const project = await clientProjects.createFromBriefForAdmin(owner, brief._id, fields);
        const updatedBrief = await ClientBrief.markConverted(brief._id, project._id);
        return res.status(201).json({ status: 'success', message: 'Project profile created from brief', data: { project, brief: updatedBrief } });
    } catch (error) {
        return next(error);
    }
};
