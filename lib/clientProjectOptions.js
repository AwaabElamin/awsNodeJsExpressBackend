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
    'Other or not sure'
];

const PROJECT_STATUSES = ['requested', 'reviewing', 'proposal_sent', 'active', 'on_hold', 'completed', 'declined'];
const REQUEST_STATUSES = ['requested', 'reviewing', 'approved', 'in_progress', 'completed', 'declined'];
const REQUEST_PRIORITIES = ['low', 'normal', 'high'];

// Long-form text fields shared by the "new project" form and the project profile.
const PROJECT_TEXT_FIELDS = [
    'problem',
    'outcome',
    'audience',
    'userTasks',
    'references',
    'mustHaves',
    'futureFeatures',
    'integrationDetails',
    'contentMaterials',
    'reviewers',
    'otherDetails'
];

const LIMITS = {
    name: 160,
    summary: 5000,
    text: 5000,
    adminNotes: 5000,
    requestTitle: 160,
    requestDetails: 5000,
    requestReason: 2000
};

module.exports = {
    PROJECT_TYPES,
    BUDGET_RANGES,
    TIMELINE_FLEXIBILITY,
    INTEGRATIONS,
    PROJECT_STATUSES,
    REQUEST_STATUSES,
    REQUEST_PRIORITIES,
    PROJECT_TEXT_FIELDS,
    LIMITS
};
