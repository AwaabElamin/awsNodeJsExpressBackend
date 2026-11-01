const {
    PROJECT_TYPES,
    BUDGET_RANGES,
    TIMELINE_FLEXIBILITY,
    INTEGRATIONS,
    REQUEST_PRIORITIES,
    PROJECT_TEXT_FIELDS,
    LIMITS
} = require('./clientProjectOptions');

function cleanText(value, maxLength, label, { required = false } = {}) {
    if (value === undefined || value === null) {
        if (required) return { error: `${label} is required.` };
        return { value: '' };
    }
    if (typeof value !== 'string') return { error: `${label} must be text.` };
    const trimmed = value.trim();
    if (required && !trimmed) return { error: `${label} is required.` };
    if (trimmed.length > maxLength) return { error: `${label} must be ${maxLength} characters or fewer.` };
    return { value: trimmed };
}

function cleanChoice(value, options, label) {
    if (value === undefined || value === null || value === '') return { value: '' };
    if (typeof value !== 'string' || !options.includes(value)) return { error: `${label} is not one of the available options.` };
    return { value };
}

function cleanDate(value, label) {
    if (value === undefined || value === null || value === '') return { value: null };
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return { error: `${label} must be a date (YYYY-MM-DD).` };
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) return { error: `${label} is not a valid date.` };
    return { value: date };
}

function cleanIntegrations(value) {
    if (value === undefined || value === null) return { value: [] };
    if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || !INTEGRATIONS.includes(item))) {
        return { error: 'Integrations contain an unknown option.' };
    }
    return { value: [...new Set(value)] };
}

// Validates the "new project" payload. Returns { fields } or { error }.
function validateProjectInput(body) {
    const source = body && typeof body === 'object' ? body : {};
    const fields = {};
    const steps = [
        ['name', () => cleanText(source.name, LIMITS.name, 'Project name', { required: true })],
        ['summary', () => cleanText(source.summary, LIMITS.summary, 'Project summary', { required: true })],
        ['type', () => cleanChoice(source.type, PROJECT_TYPES, 'Project type')],
        ['integrations', () => cleanIntegrations(source.integrations)],
        ['targetDate', () => cleanDate(source.targetDate, 'Target date')],
        ['timelineFlexibility', () => cleanChoice(source.timelineFlexibility, TIMELINE_FLEXIBILITY, 'Timeline flexibility')],
        ['budgetRange', () => cleanChoice(source.budgetRange, BUDGET_RANGES, 'Budget range')],
        ...PROJECT_TEXT_FIELDS.map((field) => [field, () => cleanText(source[field], LIMITS.text, field)])
    ];
    for (const [field, run] of steps) {
        const result = run();
        if (result.error) return { error: result.error };
        fields[field] = result.value;
    }
    return { fields };
}

// Validates a feature request payload attached to an existing project.
function validateRequestInput(body) {
    const source = body && typeof body === 'object' ? body : {};
    const fields = {};
    const steps = [
        ['title', () => cleanText(source.title, LIMITS.requestTitle, 'Feature title', { required: true })],
        ['details', () => cleanText(source.details, LIMITS.requestDetails, 'Feature details', { required: true })],
        ['reason', () => cleanText(source.reason, LIMITS.requestReason, 'Reason')],
        ['priority', () => {
            if (source.priority === undefined || source.priority === '') return { value: 'normal' };
            return cleanChoice(source.priority, REQUEST_PRIORITIES, 'Priority');
        }],
        ['targetDate', () => cleanDate(source.targetDate, 'Target date')],
        ['budgetRange', () => cleanChoice(source.budgetRange, BUDGET_RANGES, 'Budget range')]
    ];
    for (const [field, run] of steps) {
        const result = run();
        if (result.error) return { error: result.error };
        fields[field] = result.value;
    }
    return { fields };
}

module.exports = { validateProjectInput, validateRequestInput, cleanText, cleanChoice };
