const mongoose = require('mongoose');
const clientProjects = require('../models/clientProject');
const usersModel = require('../models/users');
const { cleanText, cleanChoice } = require('../lib/clientProjectInput');
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
    if (!Object.keys(fields).length) return { error: 'Provide a status or admin notes to update.' };
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
