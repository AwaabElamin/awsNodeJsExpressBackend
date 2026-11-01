const mongoose = require('mongoose');
const clientProjects = require('../models/clientProject');
const usersModel = require('../models/users');
const { cleanText, cleanChoice } = require('../lib/clientProjectInput');
const { buildPlan } = require('../lib/projectPlanner');
const { buildAnalysis } = require('../lib/requirementsAnalysis');
const { PROJECT_STATUSES, REQUEST_STATUSES, LIMITS } = require('../lib/clientProjectOptions');

function statusAndNotes(body, statuses) {
    const source = body && typeof body === 'object' ? body : {};
    const fields = {};
    if (source.status !== undefined) {
        const status = cleanChoice(source.status, statuses, 'Status');
        if (status.error || !status.value) return { error: status.error || 'Status is required.' };
        fields.status = status.value;
    }
    if (source.adminNotes !== undefined) {
        const notes = cleanText(source.adminNotes, LIMITS.adminNotes, 'Admin notes');
        if (notes.error) return { error: notes.error };
        fields.adminNotes = notes.value;
    }
    if (source.clientMessage !== undefined) {
        const message = cleanText(source.clientMessage, LIMITS.clientMessage, 'Message to the client');
        if (message.error) return { error: message.error };
        fields.clientMessage = message.value;
    }
    if (fields.status === 'needs_info' && !fields.clientMessage) {
        return { error: 'Tell the client what information is missing when asking for more details.' };
    }
    if (!Object.keys(fields).length) return { error: 'Provide a status, admin notes, or a message to the client.' };
    return { fields };
}

async function withOwner(project) {
    if (!project) return project;
    const owner = await usersModel.getManagedAccountForAdmin(project.ownerId);
    return {
        ...project,
        owner: owner
            ? { _id: owner._id, email: owner.email, firstname: owner.firstname, lastname: owner.lastname, phone: owner.phone, role: owner.role, isActive: owner.isActive }
            : null
    };
}

exports.list = async (req, res, next) => {
    const filter = {};
    if (req.query.ownerId !== undefined) {
        if (!mongoose.isValidObjectId(req.query.ownerId)) {
            return res.status(400).json({ status: 'fail', message: 'ownerId is not valid.' });
        }
        filter.ownerId = req.query.ownerId;
    }
    if (req.query.status !== undefined) {
        if (!PROJECT_STATUSES.includes(req.query.status)) {
            return res.status(400).json({ status: 'fail', message: 'status is not a known project status.' });
        }
        filter.status = req.query.status;
    }
    try {
        const projects = await clientProjects.listForAdmin(filter);
        return res.json({ status: 'success', data: projects });
    } catch (error) {
        return next(error);
    }
};

exports.get = async (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(404).json({ status: 'fail', message: 'Project not found.' });
    }
    try {
        const project = await clientProjects.getForAdmin(req.params.id);
        if (!project) return res.status(404).json({ status: 'fail', message: 'Project not found.' });
        return res.json({ status: 'success', data: await withOwner(project) });
    } catch (error) {
        return next(error);
    }
};

// Regenerates the automatic plan (e.g. after weights change or for projects created before the planner existed).
exports.regeneratePlan = async (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(404).json({ status: 'fail', message: 'Project not found.' });
    }
    try {
        const existing = await clientProjects.getForAdmin(req.params.id);
        if (!existing) return res.status(404).json({ status: 'fail', message: 'Project not found.' });
        const plan = buildPlan(existing);
        if (!plan) return res.status(422).json({ status: 'fail', message: 'This project predates the guided form; ask the client to revise it before a plan can be generated.' });
        plan.version = ((existing.plan && existing.plan.version) || 0) + 1;
        const project = await clientProjects.setPlan(existing._id, plan);
        return res.json({ status: 'success', message: `Plan v${plan.version} generated`, data: await withOwner(project) });
    } catch (error) {
        return next(error);
    }
};

// Admin confirms the automatic plan can go forward; the requirements analysis is generated from it.
exports.confirmPlan = async (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(404).json({ status: 'fail', message: 'Project not found.' });
    }
    try {
        const existing = await clientProjects.getForAdmin(req.params.id);
        if (!existing) return res.status(404).json({ status: 'fail', message: 'Project not found.' });
        if (!existing.plan) return res.status(409).json({ status: 'fail', message: 'Generate a plan before confirming it.' });
        if (['active', 'completed', 'declined'].includes(existing.status)) {
            return res.status(409).json({ status: 'fail', message: `The project is already ${existing.status}.` });
        }
        const analysis = buildAnalysis(existing, existing.plan, { confirmedBy: (req.admin && req.admin.email) || '' });
        const project = await clientProjects.confirmPlan(existing._id, (req.admin && req.admin.email) || '', analysis);
        return res.json({ status: 'success', message: 'Plan confirmed and requirements analysis created', data: await withOwner(project) });
    } catch (error) {
        return next(error);
    }
};

exports.update = async (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(404).json({ status: 'fail', message: 'Project not found.' });
    }
    const { fields, error } = statusAndNotes(req.body, PROJECT_STATUSES);
    if (error) return res.status(400).json({ status: 'fail', message: error });
    try {
        const project = await clientProjects.updateForAdmin(req.params.id, fields);
        if (!project) return res.status(404).json({ status: 'fail', message: 'Project not found.' });
        return res.json({ status: 'success', data: await withOwner(project) });
    } catch (error) {
        return next(error);
    }
};

exports.updateRequest = async (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(req.params.requestId)) {
        return res.status(404).json({ status: 'fail', message: 'Feature request not found.' });
    }
    const { fields, error } = statusAndNotes(req.body, REQUEST_STATUSES);
    if (error) return res.status(400).json({ status: 'fail', message: error });
    try {
        const project = await clientProjects.updateRequestForAdmin(req.params.id, req.params.requestId, fields);
        if (!project) return res.status(404).json({ status: 'fail', message: 'Feature request not found.' });
        return res.json({ status: 'success', data: await withOwner(project) });
    } catch (error) {
        return next(error);
    }
};
