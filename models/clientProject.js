const mongoose = require('mongoose');
const O = require('../lib/clientProjectOptions');

const optionalEnum = (values) => ({ type: String, enum: [...values, ''], default: '' });
const shortText = (maxlength) => ({ type: String, trim: true, maxlength, default: '' });
const enumList = (values) => ({ type: [{ type: String, enum: values }], default: [] });
const LEGACY_TEXT = 5000;

// SDLC 2 — Requirements: closed role type, closed capabilities, approximate count.
// Legacy `name`/`goals` kept so projects created before the closed form still read back.
const userRoleSchema = new mongoose.Schema({
    role: optionalEnum(O.USER_ROLE_TYPES),
    roleOther: shortText(O.LIMITS.shortText),
    count: optionalEnum(O.USER_COUNTS),
    capabilities: enumList(O.USER_CAPABILITIES),
    name: shortText(LEGACY_TEXT),
    goals: shortText(LEGACY_TEXT)
}, { _id: false });

const featureSchema = new mongoose.Schema({
    key: shortText(O.LIMITS.shortText),
    label: shortText(160),
    customTitle: shortText(O.LIMITS.shortText),
    priority: { type: String, enum: O.FEATURE_PRIORITIES, default: 'must' },
    details: { type: [String], default: [] },
    notes: shortText(O.LIMITS.featureNotes),
    title: shortText(LEGACY_TEXT),
    description: shortText(LEGACY_TEXT)
}, { _id: false });

const referenceSchema = new mongoose.Schema({
    url: shortText(O.LIMITS.url),
    likes: enumList(O.REFERENCE_LIKES)
}, { _id: false });

const assetsFields = {};
for (const item of O.ASSET_ITEMS) assetsFields[item] = optionalEnum(O.ASSET_STATUSES);
const assetsSchema = new mongoose.Schema(assetsFields, { _id: false });

const featureRequestSchema = new mongoose.Schema({
    kind: optionalEnum(O.REQUEST_KINDS),
    relatedFeature: shortText(160),
    userRole: shortText(160),
    summary: shortText(O.LIMITS.requestSummary),
    outcomes: enumList(O.REQUEST_OUTCOMES),
    outcomesOther: shortText(O.LIMITS.shortText),
    example: shortText(O.LIMITS.requestExample),
    priority: { type: String, enum: O.REQUEST_PRIORITIES, default: 'normal' },
    targetDate: { type: Date, default: null },
    budgetRange: optionalEnum(O.BUDGET_RANGES),
    status: { type: String, enum: O.REQUEST_STATUSES, default: 'requested' },
    clientMessage: shortText(O.LIMITS.clientMessage),
    adminNotes: shortText(O.LIMITS.adminNotes),
    // Legacy free-text request fields.
    title: shortText(160),
    details: shortText(LEGACY_TEXT),
    reason: shortText(LEGACY_TEXT),
    acceptance: shortText(LEGACY_TEXT),
    area: shortText(160)
}, { timestamps: true });

const clientProjectSchema = new mongoose.Schema({
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    ownerEmail: { type: String, trim: true, lowercase: true, maxlength: 254 },
    briefId: { type: mongoose.Schema.Types.ObjectId, ref: 'clientBriefs', default: null },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    type: optionalEnum(O.PROJECT_TYPES),

    // 1 — Planning
    industry: optionalEnum(O.INDUSTRIES),
    industryOther: shortText(O.LIMITS.shortText),
    businessSize: optionalEnum(O.BUSINESS_SIZES),
    country: shortText(O.LIMITS.shortText),
    city: shortText(O.LIMITS.shortText),
    primaryGoal: optionalEnum(O.PRIMARY_GOALS),
    primaryGoalOther: shortText(O.LIMITS.shortText),
    secondaryGoals: enumList(O.PRIMARY_GOALS),
    painPoints: enumList(O.PAIN_POINTS),
    painPointsOther: shortText(O.LIMITS.shortText),
    successMeasures: enumList(O.SUCCESS_MEASURES),
    budgetRange: optionalEnum(O.BUDGET_RANGES),
    targetDate: { type: Date, default: null },
    timelineFlexibility: optionalEnum(O.TIMELINE_FLEXIBILITY),
    decisionMakerRole: optionalEnum(O.DECISION_MAKER_ROLES),
    decisionMakerName: shortText(O.LIMITS.shortText),
    contactMethod: optionalEnum(O.CONTACT_METHODS),
    contactPhone: shortText(O.LIMITS.phone),

    // 2 — Requirements
    userRoles: { type: [userRoleSchema], default: [] },
    features: { type: [featureSchema], default: [] },
    devices: enumList(O.DEVICES),
    languages: enumList(O.LANGUAGES),
    languagesOther: shortText(O.LIMITS.shortText),
    accessibility: optionalEnum(O.ACCESSIBILITY),

    // 3 — Design
    designStyle: optionalEnum(O.DESIGN_STYLES),
    references: { type: [referenceSchema], default: [] },
    assets: { type: assetsSchema, default: () => ({}) },

    // 4 — Development
    existingWebsite: optionalEnum(O.EXISTING_WEBSITE),
    existingWebsiteUrl: shortText(O.LIMITS.url),
    existingSystems: enumList(O.EXISTING_SYSTEMS),
    existingSystemsOther: shortText(O.LIMITS.shortText),
    dataMigration: optionalEnum(O.DATA_MIGRATION),
    hostingPreference: optionalEnum(O.HOSTING_PREFERENCE),
    contentProvider: optionalEnum(O.CONTENT_PROVIDER),
    integrations: enumList(O.INTEGRATIONS),

    // 5 — Testing
    uatTesters: enumList(O.UAT_TESTERS),
    testData: optionalEnum(O.TEST_DATA),
    acceptanceMethod: optionalEnum(O.ACCEPTANCE_METHOD),

    // 6 — Deployment
    launchApproach: optionalEnum(O.LAUNCH_APPROACH),
    trainingNeeds: optionalEnum(O.TRAINING_NEEDS),

    // 7 — Maintenance
    contentMaintainer: optionalEnum(O.CONTENT_MAINTAINER),
    supportLevel: optionalEnum(O.SUPPORT_LEVEL),
    updateFrequency: optionalEnum(O.UPDATE_FREQUENCY),

    notes: shortText(O.LIMITS.notes),

    // Legacy free-text fields (projects and converted briefs created before the closed form).
    summary: shortText(LEGACY_TEXT),
    problem: shortText(LEGACY_TEXT),
    outcome: shortText(LEGACY_TEXT),
    audience: shortText(LEGACY_TEXT),
    userTasks: shortText(LEGACY_TEXT),
    mustHaves: shortText(LEGACY_TEXT),
    reviewers: shortText(160),
    otherDetails: shortText(LEGACY_TEXT),
    businessDescription: shortText(LEGACY_TEXT),
    goal: shortText(200),

    status: { type: String, enum: O.PROJECT_STATUSES, default: 'requested', index: true },
    clientMessage: shortText(O.LIMITS.clientMessage),
    adminNotes: shortText(O.LIMITS.adminNotes),
    requests: { type: [featureRequestSchema], default: [] }
}, { timestamps: true });

const clientProjectModel = mongoose.model('clientProjects', clientProjectSchema);

// Clients never see internal admin notes, on the project or on individual requests.
const CLIENT_PROJECTION = { adminNotes: 0, 'requests.adminNotes': 0 };
const SUMMARY_PROJECTION = 'name type status targetDate budgetRange primaryGoal requests.status createdAt updatedAt';

function summarize(project) {
    const requests = Array.isArray(project.requests) ? project.requests : [];
    return {
        _id: project._id,
        name: project.name,
        type: project.type,
        primaryGoal: project.primaryGoal,
        status: project.status,
        targetDate: project.targetDate,
        budgetRange: project.budgetRange,
        requestCount: requests.length,
        openRequestCount: requests.filter((request) => !['completed', 'declined'].includes(request.status)).length,
        needsInfoCount: requests.filter((request) => request.status === 'needs_info').length,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
    };
}

class ClientProjectCollection {
    static async createForOwner(owner, fields) {
        const project = await clientProjectModel.create({
            ...fields,
            ownerId: owner._id,
            ownerEmail: String(owner.email || '').trim().toLowerCase()
        });
        return clientProjectModel.findById(project._id, CLIENT_PROJECTION).lean();
    }

    static async listForOwner(ownerId) {
        const projects = await clientProjectModel.find({ ownerId }, SUMMARY_PROJECTION).sort({ updatedAt: -1 }).lean();
        return projects.map(summarize);
    }

    static async getForOwner(id, ownerId) {
        return clientProjectModel.findOne({ _id: id, ownerId }, CLIENT_PROJECTION).lean();
    }

    // Owners may revise a project only while it is still being clarified; resubmitting clears the
    // admin's question, wipes legacy free-text answers, and returns the project to the review queue.
    static async updateForOwner(id, ownerId, fields) {
        return clientProjectModel.findOneAndUpdate(
            { _id: id, ownerId, status: { $in: O.CLIENT_EDITABLE_STATUSES } },
            {
                $set: { ...fields, status: 'requested', clientMessage: '' },
                $unset: { summary: 1, problem: 1, outcome: 1, audience: 1, userTasks: 1, mustHaves: 1, reviewers: 1, otherDetails: 1, businessDescription: 1, goal: 1 }
            },
            { new: true, runValidators: true, projection: CLIENT_PROJECTION }
        ).lean();
    }

    static async addRequestForOwner(id, ownerId, request) {
        return clientProjectModel.findOneAndUpdate(
            { _id: id, ownerId },
            { $push: { requests: request } },
            { new: true, runValidators: true, projection: CLIENT_PROJECTION }
        ).lean();
    }

    static async updateRequestForOwner(id, ownerId, requestId, fields) {
        const set = { 'requests.$.status': 'requested', 'requests.$.clientMessage': '' };
        for (const [key, value] of Object.entries(fields)) {
            set[`requests.$.${key}`] = value;
        }
        return clientProjectModel.findOneAndUpdate(
            { _id: id, ownerId, requests: { $elemMatch: { _id: requestId, status: { $in: O.CLIENT_EDITABLE_STATUSES } } } },
            { $set: set },
            { new: true, runValidators: true, projection: CLIENT_PROJECTION }
        ).lean();
    }

    static async listForAdmin(filter = {}) {
        const query = {};
        if (filter.ownerId) query.ownerId = filter.ownerId;
        if (filter.status) query.status = filter.status;
        const projects = await clientProjectModel.find(query, `${SUMMARY_PROJECTION} ownerId ownerEmail`).sort({ updatedAt: -1 }).lean();
        return projects.map((project) => ({ ...summarize(project), ownerId: project.ownerId, ownerEmail: project.ownerEmail }));
    }

    static async listSummariesForOwnerAdmin(ownerId) {
        const projects = await clientProjectModel.find({ ownerId }, SUMMARY_PROJECTION).sort({ updatedAt: -1 }).lean();
        return projects.map(summarize);
    }

    static async getForAdmin(id) {
        return clientProjectModel.findById(id).lean();
    }

    static async updateForAdmin(id, fields) {
        return clientProjectModel.findByIdAndUpdate(id, { $set: fields }, { new: true, runValidators: true }).lean();
    }

    static async updateRequestForAdmin(id, requestId, fields) {
        const set = {};
        for (const [key, value] of Object.entries(fields)) {
            set[`requests.$.${key}`] = value;
        }
        return clientProjectModel.findOneAndUpdate(
            { _id: id, 'requests._id': requestId },
            { $set: set },
            { new: true, runValidators: true }
        ).lean();
    }

    static async createFromBriefForAdmin(owner, briefId, fields) {
        const project = await clientProjectModel.create({
            ...fields,
            briefId,
            ownerId: owner._id,
            ownerEmail: String(owner.email || '').trim().toLowerCase()
        });
        return project.toObject();
    }
}

module.exports = ClientProjectCollection;
