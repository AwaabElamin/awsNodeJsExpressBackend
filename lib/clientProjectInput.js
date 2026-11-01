const {
    PROJECT_TYPES,
    BUDGET_RANGES,
    TIMELINE_FLEXIBILITY,
    INTEGRATIONS,
    DEVICES,
    LANGUAGES,
    CONTENT_READINESS,
    CONTACT_METHODS,
    REQUEST_PRIORITIES,
    FEATURE_PRIORITIES,
    PROJECT_TEXT_FIELDS,
    LIMITS,
    MIN_WORDS
} = require('./clientProjectOptions');

const LATIN_WORD = /^[a-z]+$/i;
const VOWEL = /[aeiouy]/i;
const LONG_CONSONANT_RUN = /[bcdfghjklmnpqrstvwxz]{5,}/i;

function words(text) {
    return String(text || '').trim().split(/\s+/).filter(Boolean);
}

// Rejects keyboard-mashing in Latin script: real words almost always contain a vowel and rarely
// run five consonants in a row. Non-Latin text (e.g. Arabic) is not judged by this check.
function isReadableText(text) {
    const latinWords = words(text)
        .map((word) => word.replace(/^[^a-z]+|[^a-z]+$/gi, ''))
        .filter((word) => word.length >= 3 && LATIN_WORD.test(word));
    if (latinWords.length < 3) return true;
    const readable = latinWords.filter((word) => VOWEL.test(word) && !LONG_CONSONANT_RUN.test(word)).length;
    return readable / latinWords.length >= 0.8;
}

function cleanText(value, maxLength, label, { required = false, minWords = 0, readable = false } = {}) {
    if (value === undefined || value === null) {
        if (required) return { error: `${label} is required.` };
        return { value: '' };
    }
    if (typeof value !== 'string') return { error: `${label} must be text.` };
    const trimmed = value.trim();
    if (required && !trimmed) return { error: `${label} is required.` };
    if (trimmed.length > maxLength) return { error: `${label} must be ${maxLength} characters or fewer.` };
    if (trimmed && minWords && words(trimmed).length < minWords) {
        return { error: `${label} needs at least ${minWords} words so our developers can understand it.` };
    }
    if (trimmed && readable && !isReadableText(trimmed)) {
        return { error: `${label} does not look like readable text. Please describe it in plain words.` };
    }
    return { value: trimmed };
}

function cleanChoice(value, options, label, { required = false } = {}) {
    if (value === undefined || value === null || value === '') {
        if (required) return { error: `${label} is required.` };
        return { value: '' };
    }
    if (typeof value !== 'string' || !options.includes(value)) return { error: `${label} is not one of the available options.` };
    return { value };
}

function cleanChoiceList(value, options, label, { required = false } = {}) {
    if (value === undefined || value === null) {
        if (required) return { error: `Choose at least one option for ${label}.` };
        return { value: [] };
    }
    if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || !options.includes(item))) {
        return { error: `${label} contains an unknown option.` };
    }
    const unique = [...new Set(value)];
    if (required && !unique.length) return { error: `Choose at least one option for ${label}.` };
    return { value: unique };
}

function cleanDate(value, label) {
    if (value === undefined || value === null || value === '') return { value: null };
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return { error: `${label} must be a date (YYYY-MM-DD).` };
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) return { error: `${label} is not a valid date.` };
    return { value: date };
}

// Each user role: who they are and what they must be able to do.
function cleanUserRoles(value) {
    if (!Array.isArray(value) || !value.length) return { error: 'Add at least one type of user and what they need to do.' };
    if (value.length > LIMITS.maxRoles) return { error: `List at most ${LIMITS.maxRoles} user types.` };
    const roles = [];
    for (const [index, role] of value.entries()) {
        const source = role && typeof role === 'object' ? role : {};
        const name = cleanText(source.name, LIMITS.roleName, `User type ${index + 1} name`, { required: true, readable: true });
        if (name.error) return { error: name.error };
        const goals = cleanText(source.goals, LIMITS.roleGoals, `What "${name.value}" users need to do`, { required: true, minWords: MIN_WORDS.roleGoals, readable: true });
        if (goals.error) return { error: goals.error };
        roles.push({ name: name.value, goals: goals.value });
    }
    return { value: roles };
}

// Each must-have feature: a title, what happens step by step, and a MoSCoW-style priority.
function cleanFeatures(value) {
    if (!Array.isArray(value) || !value.length) return { error: 'Add at least one feature the first version must include.' };
    if (value.length > LIMITS.maxFeatures) return { error: `List at most ${LIMITS.maxFeatures} features.` };
    const features = [];
    for (const [index, feature] of value.entries()) {
        const source = feature && typeof feature === 'object' ? feature : {};
        const title = cleanText(source.title, LIMITS.featureTitle, `Feature ${index + 1} title`, { required: true, readable: true });
        if (title.error) return { error: title.error };
        const description = cleanText(source.description, LIMITS.featureDescription, `Feature "${title.value}" description`, { required: true, minWords: MIN_WORDS.featureDescription, readable: true });
        if (description.error) return { error: description.error };
        const priority = source.priority === undefined || source.priority === ''
            ? { value: 'must' }
            : cleanChoice(source.priority, FEATURE_PRIORITIES, `Feature "${title.value}" priority`);
        if (priority.error) return { error: priority.error };
        features.push({ title: title.value, description: description.value, priority: priority.value });
    }
    return { value: features };
}

function runSteps(steps) {
    const fields = {};
    for (const [field, run] of steps) {
        const result = run();
        if (result.error) return { error: result.error };
        fields[field] = result.value;
    }
    return { fields };
}

// Validates the project payload (create and client edit). Returns { fields } or { error }.
function validateProjectInput(body) {
    const source = body && typeof body === 'object' ? body : {};
    return runSteps([
        ['name', () => cleanText(source.name, LIMITS.name, 'Project name', { required: true, readable: true })],
        ['type', () => cleanChoice(source.type, PROJECT_TYPES, 'Project type', { required: true })],
        ['businessDescription', () => cleanText(source.businessDescription, LIMITS.text, 'What your business does', { required: true, minWords: MIN_WORDS.businessDescription, readable: true })],
        ['goal', () => cleanText(source.goal, LIMITS.goal, 'One-sentence goal', { required: true, minWords: 5, readable: true })],
        ['summary', () => cleanText(source.summary, LIMITS.summary, 'Project description', { required: true, minWords: MIN_WORDS.summary, readable: true })],
        ['problem', () => cleanText(source.problem, LIMITS.text, 'Problem or opportunity', { required: true, minWords: MIN_WORDS.problem, readable: true })],
        ['outcome', () => cleanText(source.outcome, LIMITS.text, 'Definition of success', { required: true, minWords: MIN_WORDS.outcome, readable: true })],
        ['userRoles', () => cleanUserRoles(source.userRoles)],
        ['features', () => cleanFeatures(source.features)],
        ['devices', () => cleanChoiceList(source.devices, DEVICES, 'devices', { required: true })],
        ['languages', () => cleanChoiceList(source.languages, LANGUAGES, 'languages', { required: true })],
        ['contentReadiness', () => cleanChoice(source.contentReadiness, CONTENT_READINESS, 'Content readiness', { required: true })],
        ['integrations', () => cleanChoiceList(source.integrations, INTEGRATIONS, 'integrations')],
        ['targetDate', () => cleanDate(source.targetDate, 'Target date')],
        ['timelineFlexibility', () => cleanChoice(source.timelineFlexibility, TIMELINE_FLEXIBILITY, 'Timeline flexibility', { required: true })],
        ['budgetRange', () => cleanChoice(source.budgetRange, BUDGET_RANGES, 'Budget range', { required: true })],
        ['decisionMaker', () => cleanText(source.decisionMaker, LIMITS.name, 'Who approves the work', { required: true, readable: true })],
        ['contactMethod', () => cleanChoice(source.contactMethod, CONTACT_METHODS, 'Preferred contact method', { required: true })],
        ['contactPhone', () => cleanText(source.contactPhone, LIMITS.phone, 'Contact phone')],
        ...PROJECT_TEXT_FIELDS.map((field) => [field, () => cleanText(source[field], LIMITS.text, field, { readable: true })])
    ]);
}

// Validates a feature request attached to an existing project (create and client edit).
function validateRequestInput(body) {
    const source = body && typeof body === 'object' ? body : {};
    return runSteps([
        ['title', () => cleanText(source.title, LIMITS.requestTitle, 'Feature title', { required: true, readable: true })],
        ['userRole', () => cleanText(source.userRole, LIMITS.roleName, 'Who uses this feature', { required: true, readable: true })],
        ['details', () => cleanText(source.details, LIMITS.requestDetails, 'What should happen', { required: true, minWords: MIN_WORDS.requestDetails, readable: true })],
        ['reason', () => cleanText(source.reason, LIMITS.requestReason, 'Why it is needed', { required: true, minWords: MIN_WORDS.requestReason, readable: true })],
        ['acceptance', () => cleanText(source.acceptance, LIMITS.requestAcceptance, 'How we know it is done', { required: true, minWords: MIN_WORDS.requestAcceptance, readable: true })],
        ['area', () => cleanText(source.area, LIMITS.requestArea, 'Affected page or area', { readable: true })],
        ['priority', () => source.priority === undefined || source.priority === '' ? { value: 'normal' } : cleanChoice(source.priority, REQUEST_PRIORITIES, 'Priority')],
        ['targetDate', () => cleanDate(source.targetDate, 'Target date')],
        ['budgetRange', () => cleanChoice(source.budgetRange, BUDGET_RANGES, 'Budget range')]
    ]);
}

// Lenient validation for legacy public briefs converted by Admin: only types, choices and lengths are
// enforced, because those briefs predate the structured form. The result is flagged needs_info.
function validateLegacyProjectInput(body) {
    const source = body && typeof body === 'object' ? body : {};
    return runSteps([
        ['name', () => cleanText(source.name, LIMITS.name, 'Project name', { required: true })],
        ['type', () => cleanChoice(source.type, PROJECT_TYPES, 'Project type')],
        ['summary', () => cleanText(source.summary, LIMITS.summary, 'Project description', { required: true })],
        ['problem', () => cleanText(source.problem, LIMITS.text, 'Problem or opportunity')],
        ['outcome', () => cleanText(source.outcome, LIMITS.text, 'Definition of success')],
        ['audience', () => cleanText(source.audience, LIMITS.text, 'Audience')],
        ['userTasks', () => cleanText(source.userTasks, LIMITS.text, 'Typical user tasks')],
        ['mustHaves', () => cleanText(source.mustHaves, LIMITS.text, 'Must-have features')],
        ['reviewers', () => cleanText(source.reviewers, LIMITS.name, 'Reviewers')],
        ['integrations', () => cleanChoiceList(source.integrations, INTEGRATIONS, 'integrations')],
        ['targetDate', () => cleanDate(source.targetDate, 'Target date')],
        ['timelineFlexibility', () => cleanChoice(source.timelineFlexibility, TIMELINE_FLEXIBILITY, 'Timeline flexibility')],
        ['budgetRange', () => cleanChoice(source.budgetRange, BUDGET_RANGES, 'Budget range')],
        ...PROJECT_TEXT_FIELDS.map((field) => [field, () => cleanText(source[field], LIMITS.text, field)])
    ]);
}

module.exports = { validateProjectInput, validateLegacyProjectInput, validateRequestInput, cleanText, cleanChoice, isReadableText };
