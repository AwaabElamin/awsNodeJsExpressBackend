// Shared vocabularies for client project profiles and feature requests.
// Kept outside the model so controllers and tests can import them without touching Mongoose.

const PROJECT_TYPES = [
    'Website',
    'Web application',
    'Mobile application',
    'Business software or portal',
    'Automation or integration',
    'Consulting or technical support',
    'Other / not sure yet'
];

const BUDGET_RANGES = [
    'Under $2,500',
    '$2,500–$5,000',
    '$5,000–$10,000',
    '$10,000–$25,000',
    'Over $25,000',
    'Need guidance',
    'Prefer to discuss'
];

const TIMELINE_FLEXIBILITY = ['Fixed date', 'Some flexibility', 'Flexible', 'Not sure yet'];

const INTEGRATIONS = [
    'Payments or billing',
    'Email or messaging',
    'Scheduling or calendars',
    'Accounting or CRM',
    'Inventory or databases',
    'Maps or delivery tracking',
    'Social media or WhatsApp',
    'Other or not sure'
];

const DEVICES = ['Desktop web', 'Mobile web', 'Android app', 'iOS app'];
const LANGUAGES = ['English', 'Arabic', 'Other'];
const CONTENT_READINESS = [
    'Everything is ready (logo, text, photos, data)',
    'Some content is ready; the rest needs work',
    'Nothing yet; we need help creating content'
];
const CONTACT_METHODS = ['Email', 'Phone call', 'WhatsApp'];

// "needs_info" is set by Admin when a request is too vague to build from; the client can then edit it.
const PROJECT_STATUSES = ['requested', 'needs_info', 'reviewing', 'proposal_sent', 'active', 'on_hold', 'completed', 'declined'];
const REQUEST_STATUSES = ['requested', 'needs_info', 'reviewing', 'approved', 'in_progress', 'completed', 'declined'];
const CLIENT_EDITABLE_STATUSES = ['requested', 'needs_info'];
const REQUEST_PRIORITIES = ['low', 'normal', 'high'];
const FEATURE_PRIORITIES = ['must', 'should', 'could'];

// Optional long-form text fields shared by the project form and the profile.
const PROJECT_TEXT_FIELDS = [
    'successMetrics',
    'existingSystems',
    'references',
    'futureFeatures',
    'integrationDetails',
    'contentMaterials',
    'constraints',
    'otherDetails'
];

const LIMITS = {
    name: 160,
    goal: 200,
    summary: 5000,
    text: 5000,
    adminNotes: 5000,
    clientMessage: 2000,
    roleName: 80,
    roleGoals: 1000,
    featureTitle: 120,
    featureDescription: 2000,
    maxRoles: 10,
    maxFeatures: 20,
    requestTitle: 160,
    requestDetails: 5000,
    requestReason: 2000,
    requestAcceptance: 2000,
    requestArea: 160,
    phone: 40
};

// Minimum word counts for free text that developers must be able to build from.
const MIN_WORDS = {
    businessDescription: 8,
    summary: 15,
    problem: 10,
    outcome: 8,
    roleGoals: 4,
    featureDescription: 8,
    requestDetails: 12,
    requestReason: 5,
    requestAcceptance: 5
};

module.exports = {
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
    LIMITS,
    MIN_WORDS
};
