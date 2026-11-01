const mongoose = require('mongoose');
const {
    PROJECT_TYPES,
    BUDGET_RANGES,
    TIMELINE_FLEXIBILITY,
    INTEGRATIONS,
    DEVICES,
    LANGUAGES,
    CONTENT_READINESS,
    CONTACT_METHODS,
    PROJECT_STATUSES,
    REQUEST_STATUSES,
    CLIENT_EDITABLE_STATUSES,
    REQUEST_PRIORITIES,
    FEATURE_PRIORITIES,
    PROJECT_TEXT_FIELDS,
    LIMITS
} = require('../lib/clientProjectOptions');

const optionalEnum = (values) => ({ type: String, enum: [...values, ''], default: '' });
const longText = (maxlength) => ({ type: String, trim: true, maxlength, default: '' });
const enumList = (values) => ({ type: [{ type: String, enum: values }], default: [] });

const userRoleSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: LIMITS.roleName },
    goals: { type: String, required: true, trim: true, maxlength: LIMITS.roleGoals }
}, { _id: false });

const featureSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true, maxlength: LIMITS.featureTitle },
    description: { type: String, required: true, trim: true, maxlength: LIMITS.featureDescription },
    priority: { type: String, enum: FEATURE_PRIORITIES, default: 'must' }
}, { _id: false });

const featureRequestSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true, maxlength: LIMITS.requestTitle },
    userRole: longText(LIMITS.roleName),
    details: { type: String, required: true, trim: true, maxlength: LIMITS.requestDetails },
    reason: longText(LIMITS.requestReason),
    acceptance: longText(LIMITS.requestAcceptance),
    area: longText(LIMITS.requestArea),
    priority: { type: String, enum: REQUEST_PRIORITIES, default: 'normal' },
    targetDate: { type: Date, default: null },
    budgetRange: optionalEnum(BUDGET_RANGES),
    status: { type: String, enum: REQUEST_STATUSES, default: 'requested' },
    // Admin → client questions (visible to the client); adminNotes stay internal.
    clientMessage: longText(LIMITS.clientMessage),
    adminNotes: longText(LIMITS.adminNotes)
}, { timestamps: true });

const projectFields = {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    ownerEmail: { type: String, trim: true, lowercase: true, maxlength: 254 },
    briefId: { type: mongoose.Schema.Types.ObjectId, ref: 'clientBriefs', default: null },
    name: { type: String, required: true, trim: true, maxlength: LIMITS.name },
    type: optionalEnum(PROJECT_TYPES),
    businessDescription: longText(LIMITS.text),
    goal: longText(LIMITS.goal),
    summary: { type: String, required: true, trim: true, maxlength: LIMITS.summary },
    problem: longText(LIMITS.text),
    outcome: longText(LIMITS.text),
    userRoles: { type: [userRoleSchema], default: [] },
    features: { type: [featureSchema], default: [] },
    devices: enumList(DEVICES),
    languages: enumList(LANGUAGES),
    contentReadiness: optionalEnum(CONTENT_READINESS),
    integrations: enumList(INTEGRATIONS),
    targetDate: { type: Date, default: null },
    timelineFlexibility: optionalEnum(TIMELINE_FLEXIBILITY),
    budgetRange: optionalEnum(BUDGET_RANGES),
    decisionMaker: longText(LIMITS.name),
    contactMethod: optionalEnum(CONTACT_METHODS),
    contactPhone: longText(LIMITS.phone),
    // Legacy free-text fields kept so projects created before the structured form still display.
    audience: longText(LIMITS.text),
    userTasks: longText(LIMITS.text),
    mustHaves: longText(LIMITS.text),
    reviewers: longText(LIMITS.name),
    status: { type: String, enum: PROJECT_STATUSES, default: 'requested', index: true },
    clientMessage: longText(LIMITS.clientMessage),
    adminNotes: longText(LIMITS.adminNotes),
    requests: { type: [featureRequestSchema], default: [] }
};
for (const field of PROJECT_TEXT_FIELDS) {
    projectFields[field] = longText(LIMITS.text);
}

const clientProjectSchema = new mongoose.Schema(projectFields, { timestamps: true });
const clientProjectModel = mongoose.model('clientProjects', clientProjectSchema);

// Clients never see internal admin notes, on the project or on individual requests.
const CLIENT_PROJECTION = { adminNotes: 0, 'requests.adminNotes': 0 };
const SUMMARY_PROJECTION = 'name type status targetDate budgetRange requests.status createdAt updatedAt';

function summarize(project) {
    const requests = Array.isArray(project.requests) ? project.requests : [];
    return {
        _id: project._id,
        name: project.name,
        type: project.type,
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

    // Owners may revise a project only while it is still being clarified. Re-submitting clears the
    // admin's question and puts the project back in the review queue.
    static async updateForOwner(id, ownerId, fields) {
        return clientProjectModel.findOneAndUpdate(
            { _id: id, ownerId, status: { $in: CLIENT_EDITABLE_STATUSES } },
            { $set: { ...fields, status: 'requested', clientMessage: '' } },
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
            { _id: id, ownerId, requests: { $elemMatch: { _id: requestId, status: { $in: CLIENT_EDITABLE_STATUSES } } } },
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
