const mongoose = require('mongoose');
const clientProjects = require('../models/clientProject');
const { validateProjectInput, validateRequestInput } = require('../lib/clientProjectInput');
const options = require('../lib/clientProjectOptions');

exports.options = (req, res) => {
    res.json({
        status: 'success',
        data: {
            projectTypes: options.PROJECT_TYPES,
            budgetRanges: options.BUDGET_RANGES,
            timelineFlexibility: options.TIMELINE_FLEXIBILITY,
            integrations: options.INTEGRATIONS,
            projectStatuses: options.PROJECT_STATUSES,
            requestStatuses: options.REQUEST_STATUSES,
            requestPriorities: options.REQUEST_PRIORITIES
        }
    });
};

exports.listMine = async (req, res, next) => {
    try {
        const projects = await clientProjects.listForOwner(req.client._id);
        return res.json({ status: 'success', data: projects });
    } catch (error) {
        return next(error);
    }
};

exports.create = async (req, res, next) => {
    const { fields, error } = validateProjectInput(req.body);
    if (error) {
        return res.status(400).json({ status: 'fail', message: error });
    }
    try {
        const project = await clientProjects.createForOwner(req.client, fields);
        return res.status(201).json({ status: 'success', message: 'Project request received', data: project });
    } catch (error) {
        return next(error);
    }
};

exports.getMine = async (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(404).json({ status: 'fail', message: 'Project not found.' });
    }
    try {
        const project = await clientProjects.getForOwner(req.params.id, req.client._id);
        if (!project) return res.status(404).json({ status: 'fail', message: 'Project not found.' });
        return res.json({ status: 'success', data: project });
    } catch (error) {
        return next(error);
    }
};

exports.addRequest = async (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(404).json({ status: 'fail', message: 'Project not found.' });
    }
    const { fields, error } = validateRequestInput(req.body);
    if (error) {
        return res.status(400).json({ status: 'fail', message: error });
    }
    try {
        const project = await clientProjects.addRequestForOwner(req.params.id, req.client._id, fields);
        if (!project) return res.status(404).json({ status: 'fail', message: 'Project not found.' });
        return res.status(201).json({ status: 'success', message: 'Feature request received', data: project });
    } catch (error) {
        return next(error);
    }
};
