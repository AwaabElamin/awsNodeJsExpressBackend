const mongoose = require('mongoose');
const clientProjects = require('../models/clientProject');
const { validateProjectInput, validateRequestInput } = require('../lib/clientProjectInput');
const O = require('../lib/clientProjectOptions');

// Every vocabulary the closed form needs, grouped by SDLC phase, so the frontend never hard-codes options.
const OPTIONS_PAYLOAD = {
    projectTypes: O.PROJECT_TYPES,
    planning: {
        industries: O.INDUSTRIES,
        businessSizes: O.BUSINESS_SIZES,
        countries: O.COUNTRIES,
        primaryGoals: O.PRIMARY_GOALS,
        painPoints: O.PAIN_POINTS,
        successMeasures: O.SUCCESS_MEASURES,
        budgetRanges: O.BUDGET_RANGES,
        timelineFlexibility: O.TIMELINE_FLEXIBILITY,
        decisionMakerRoles: O.DECISION_MAKER_ROLES,
        contactMethods: O.CONTACT_METHODS
    },
    requirements: {
        userRoleTypes: O.USER_ROLE_TYPES,
        userCounts: O.USER_COUNTS,
        userCapabilities: O.USER_CAPABILITIES,
        capabilitiesByRole: O.CAPABILITIES_BY_ROLE,
        devicesByType: O.DEVICES_BY_TYPE,
        featureCatalogue: O.FEATURE_CATALOGUE,
        featurePriorities: O.FEATURE_PRIORITIES,
        devices: O.DEVICES,
        languages: O.LANGUAGES,
        accessibility: O.ACCESSIBILITY
    },
    design: {
        designStyles: O.DESIGN_STYLES,
        referenceLikes: O.REFERENCE_LIKES,
        assetItems: O.ASSET_ITEMS,
        assetLabels: O.ASSET_LABELS,
        assetStatuses: O.ASSET_STATUSES
    },
    development: {
        existingWebsite: O.EXISTING_WEBSITE,
        existingSystems: O.EXISTING_SYSTEMS,
        dataMigration: O.DATA_MIGRATION,
        hostingPreference: O.HOSTING_PREFERENCE,
        contentProvider: O.CONTENT_PROVIDER,
        integrations: O.INTEGRATIONS
    },
    testing: {
        uatTesters: O.UAT_TESTERS,
        testData: O.TEST_DATA,
        acceptanceMethod: O.ACCEPTANCE_METHOD
    },
    deployment: {
        launchApproach: O.LAUNCH_APPROACH,
        trainingNeeds: O.TRAINING_NEEDS
    },
    maintenance: {
        contentMaintainer: O.CONTENT_MAINTAINER,
        supportLevel: O.SUPPORT_LEVEL,
        updateFrequency: O.UPDATE_FREQUENCY
    },
    requests: {
        kinds: O.REQUEST_KINDS,
        outcomes: O.REQUEST_OUTCOMES,
        priorities: O.REQUEST_PRIORITIES
    },
    projectStatuses: O.PROJECT_STATUSES,
    requestStatuses: O.REQUEST_STATUSES,
    clientEditableStatuses: O.CLIENT_EDITABLE_STATUSES,
    limits: O.LIMITS,
    maxChoices: O.MAX_CHOICES,
    minWords: O.MIN_WORDS
};

exports.options = (req, res) => {
    res.json({ status: 'success', data: OPTIONS_PAYLOAD });
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
    const { fields, error } = validateProjectInput(req.body, req.client);
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

exports.updateMine = async (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(404).json({ status: 'fail', message: 'Project not found.' });
    }
    const { fields, error } = validateProjectInput(req.body, req.client);
    if (error) {
        return res.status(400).json({ status: 'fail', message: error });
    }
    try {
        const project = await clientProjects.updateForOwner(req.params.id, req.client._id, fields);
        if (!project) {
            const existing = await clientProjects.getForOwner(req.params.id, req.client._id);
            if (!existing) return res.status(404).json({ status: 'fail', message: 'Project not found.' });
            return res.status(409).json({ status: 'fail', code: 'PROJECT_LOCKED', message: 'This project is already under review and can no longer be edited. Add a feature request instead.' });
        }
        return res.json({ status: 'success', message: 'Project updated', data: project });
    } catch (error) {
        return next(error);
    }
};

exports.addRequest = async (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(404).json({ status: 'fail', message: 'Project not found.' });
    }
    try {
        const existing = await clientProjects.getForOwner(req.params.id, req.client._id);
        if (!existing) return res.status(404).json({ status: 'fail', message: 'Project not found.' });
        const { fields, error } = validateRequestInput(req.body, existing);
        if (error) return res.status(400).json({ status: 'fail', message: error });
        const project = await clientProjects.addRequestForOwner(req.params.id, req.client._id, fields);
        if (!project) return res.status(404).json({ status: 'fail', message: 'Project not found.' });
        return res.status(201).json({ status: 'success', message: 'Feature request received', data: project });
    } catch (error) {
        return next(error);
    }
};

exports.updateMyRequest = async (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(req.params.requestId)) {
        return res.status(404).json({ status: 'fail', message: 'Feature request not found.' });
    }
    try {
        const existing = await clientProjects.getForOwner(req.params.id, req.client._id);
        const request = existing && existing.requests.find((item) => String(item._id) === req.params.requestId);
        if (!request) return res.status(404).json({ status: 'fail', message: 'Feature request not found.' });
        const { fields, error } = validateRequestInput(req.body, existing);
        if (error) return res.status(400).json({ status: 'fail', message: error });
        const project = await clientProjects.updateRequestForOwner(req.params.id, req.client._id, req.params.requestId, fields);
        if (!project) {
            return res.status(409).json({ status: 'fail', code: 'REQUEST_LOCKED', message: 'This feature request is already under review and can no longer be edited.' });
        }
        return res.json({ status: 'success', message: 'Feature request updated', data: project });
    } catch (error) {
        return next(error);
    }
};
