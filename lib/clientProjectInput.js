const O = require('./clientProjectOptions');

const LATIN_WORD = /^[a-z]+$/i;
const VOWEL = /[aeiouy]/i;
const LONG_CONSONANT_RUN = /[bcdfghjklmnpqrstvwxz]{5,}/i;

function words(text) {
    return String(text || '').trim().split(/\s+/).filter(Boolean);
}

// Rejects keyboard-mashing in Latin script. Non-Latin text (e.g. Arabic) is not judged.
function isReadableText(text) {
    const latinWords = words(text)
        .map((word) => word.replace(/^[^a-z]+|[^a-z]+$/gi, ''))
        .filter((word) => word.length >= 3 && LATIN_WORD.test(word));
    if (latinWords.length < 2) return true;
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
        return { error: `${label} needs at least ${minWords} words.` };
    }
    if (trimmed && readable && !isReadableText(trimmed)) {
        return { error: `${label} does not look like readable text. Please write it in plain words.` };
    }
    return { value: trimmed };
}

function cleanChoice(value, options, label, { required = false } = {}) {
    if (value === undefined || value === null || value === '') {
        if (required) return { error: `Please choose an option for "${label}".` };
        return { value: '' };
    }
    if (typeof value !== 'string' || !options.includes(value)) return { error: `"${label}" is not one of the available options.` };
    return { value };
}

function cleanChoiceList(value, options, label, { required = false, max = 0 } = {}) {
    if (value === undefined || value === null) {
        if (required) return { error: `Choose at least one option for "${label}".` };
        return { value: [] };
    }
    if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || !options.includes(item))) {
        return { error: `"${label}" contains an unknown option.` };
    }
    const unique = [...new Set(value)];
    if (required && !unique.length) return { error: `Choose at least one option for "${label}".` };
    if (max && unique.length > max) return { error: `Choose at most ${max} options for "${label}".` };
    return { value: unique };
}

function cleanDate(value, label) {
    if (value === undefined || value === null || value === '') return { value: null };
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return { error: `${label} must be a date (YYYY-MM-DD).` };
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) return { error: `${label} is not a valid date.` };
    return { value: date };
}

function cleanUrl(value, label, { required = false } = {}) {
    if (value === undefined || value === null || value === '') {
        if (required) return { error: `${label} is required.` };
        return { value: '' };
    }
    if (typeof value !== 'string' || value.length > O.LIMITS.url) return { error: `${label} must be a link of ${O.LIMITS.url} characters or fewer.` };
    const candidate = /^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`;
    try {
        const url = new URL(candidate);
        if (!url.hostname.includes('.')) throw new Error('no tld');
        return { value: url.toString() };
    } catch (_) {
        return { error: `${label} must be a valid web address (e.g. https://example.com).` };
    }
}

// "Other" choices must be named in a short text field so the answer is still specific.
function cleanOther(choice, otherValue, label) {
    if (choice !== 'Other') return { value: '' };
    return cleanText(otherValue, O.LIMITS.shortText, `${label} (other)`, { required: true, readable: true });
}

// SDLC phase 2 — each user role is a closed role type with closed capabilities and an approximate count.
function cleanUserRoles(value) {
    if (!Array.isArray(value) || !value.length) return { error: 'Add at least one type of user.' };
    if (value.length > O.LIMITS.maxRoles) return { error: `List at most ${O.LIMITS.maxRoles} user types.` };
    const roles = [];
    for (const [index, item] of value.entries()) {
        const source = item && typeof item === 'object' ? item : {};
        const label = `User type ${index + 1}`;
        const role = cleanChoice(source.role, O.USER_ROLE_TYPES, `${label} role`, { required: true });
        if (role.error) return role;
        const roleOther = cleanOther(role.value, source.roleOther, `${label} role`);
        if (roleOther.error) return roleOther;
        const count = cleanChoice(source.count, O.USER_COUNTS, `${label} — how many`, { required: true });
        if (count.error) return count;
        const capabilities = cleanChoiceList(source.capabilities, O.USER_CAPABILITIES, `${label} — what they can do`, { required: true });
        if (capabilities.error) return capabilities;
        roles.push({ role: role.value, roleOther: roleOther.value, count: count.value, capabilities: capabilities.value });
    }
    return { value: roles };
}

// SDLC phase 2 — features are picked from the catalogue; "other" needs a short name.
function cleanFeatures(value, projectType) {
    if (!Array.isArray(value) || !value.length) return { error: 'Choose at least one feature for the first version.' };
    if (value.length > O.LIMITS.maxFeatures) return { error: `Choose at most ${O.LIMITS.maxFeatures} features.` };
    const seen = new Set();
    const features = [];
    for (const [index, item] of value.entries()) {
        const source = item && typeof item === 'object' ? item : {};
        const entry = O.FEATURE_CATALOGUE.find((feature) => feature.key === source.key);
        if (!entry) return { error: `Feature ${index + 1} is not in the feature list.` };
        if (entry.types.length && projectType && !entry.types.includes(projectType)) {
            return { error: `"${entry.label}" is not available for a ${projectType}.` };
        }
        if (entry.key !== 'other' && seen.has(entry.key)) return { error: `"${entry.label}" was chosen twice.` };
        seen.add(entry.key);
        const customTitle = entry.key === 'other'
            ? cleanText(source.customTitle, O.LIMITS.shortText, `Feature ${index + 1} name`, { required: true, readable: true })
            : { value: '' };
        if (customTitle.error) return customTitle;
        const priority = source.priority === undefined || source.priority === ''
            ? { value: 'must' }
            : cleanChoice(source.priority, O.FEATURE_PRIORITIES, `"${entry.label}" priority`);
        if (priority.error) return priority;
        const details = entry.detailOptions
            ? cleanChoiceList(source.details, entry.detailOptions, `${entry.label} — ${entry.detailQuestion}`, { required: true })
            : { value: [] };
        if (details.error) return details;
        const notes = cleanText(source.notes, O.LIMITS.featureNotes, `"${entry.label}" notes`, { readable: true });
        if (notes.error) return notes;
        features.push({ key: entry.key, label: entry.label, customTitle: customTitle.value, priority: priority.value, details: details.value, notes: notes.value });
    }
    return { value: features };
}

// SDLC phase 3 — up to three reference links, each with closed "what you like" picks.
function cleanReferences(value) {
    if (value === undefined || value === null) return { value: [] };
    if (!Array.isArray(value)) return { error: 'References must be a list.' };
    const items = value.filter((item) => item && typeof item === 'object' && (String(item.url || '').trim() || (Array.isArray(item.likes) && item.likes.length)));
    if (items.length > O.LIMITS.maxReferenceUrls) return { error: `Add at most ${O.LIMITS.maxReferenceUrls} reference links.` };
    const references = [];
    for (const [index, item] of items.entries()) {
        const url = cleanUrl(item.url, `Reference link ${index + 1}`, { required: true });
        if (url.error) return url;
        const likes = cleanChoiceList(item.likes, O.REFERENCE_LIKES, `Reference ${index + 1} — what you like`, { required: true });
        if (likes.error) return likes;
        references.push({ url: url.value, likes: likes.value });
    }
    return { value: references };
}

// SDLC phase 3 — every asset must be marked have / need / not sure.
function cleanAssets(value) {
    const source = value && typeof value === 'object' ? value : {};
    const assets = {};
    for (const item of O.ASSET_ITEMS) {
        const status = cleanChoice(source[item], O.ASSET_STATUSES, O.ASSET_LABELS[item], { required: true });
        if (status.error) return status;
        assets[item] = status.value;
    }
    return { value: assets };
}

function runSteps(steps) {
    const fields = {};
    for (const [field, run] of steps) {
        const result = run(fields);
        if (result.error) return { error: result.error };
        fields[field] = result.value;
    }
    return { fields };
}

// Validates the project payload (create and client edit). Organised by SDLC phase.
function validateProjectInput(body) {
    const s = body && typeof body === 'object' ? body : {};
    return runSteps([
        // 1 — Planning
        ['name', () => cleanText(s.name, O.LIMITS.name, 'Project name', { required: true, readable: true })],
        ['type', () => cleanChoice(s.type, O.PROJECT_TYPES, 'Project type', { required: true })],
        ['industry', () => cleanChoice(s.industry, O.INDUSTRIES, 'Industry', { required: true })],
        ['industryOther', (f) => cleanOther(f.industry, s.industryOther, 'Industry')],
        ['businessSize', () => cleanChoice(s.businessSize, O.BUSINESS_SIZES, 'Business size', { required: true })],
        ['country', () => cleanText(s.country, O.LIMITS.shortText, 'Country', { required: true, readable: true })],
        ['city', () => cleanText(s.city, O.LIMITS.shortText, 'City', { readable: true })],
        ['primaryGoal', () => cleanChoice(s.primaryGoal, O.PRIMARY_GOALS, 'Primary goal', { required: true })],
        ['primaryGoalOther', (f) => cleanOther(f.primaryGoal, s.primaryGoalOther, 'Primary goal')],
        ['secondaryGoals', () => cleanChoiceList(s.secondaryGoals, O.PRIMARY_GOALS, 'Secondary goals', { max: 3 })],
        ['painPoints', () => cleanChoiceList(s.painPoints, O.PAIN_POINTS, 'What is difficult today', { required: true })],
        ['painPointsOther', (f) => (f.painPoints.includes('Other') ? cleanText(s.painPointsOther, O.LIMITS.shortText, 'What is difficult today (other)', { required: true, readable: true }) : { value: '' })],
        ['successMeasures', () => cleanChoiceList(s.successMeasures, O.SUCCESS_MEASURES, 'How success is measured', { required: true })],
        ['budgetRange', () => cleanChoice(s.budgetRange, O.BUDGET_RANGES, 'Budget range', { required: true })],
        ['targetDate', () => cleanDate(s.targetDate, 'Target date')],
        ['timelineFlexibility', () => cleanChoice(s.timelineFlexibility, O.TIMELINE_FLEXIBILITY, 'Timeline flexibility', { required: true })],
        ['decisionMakerRole', () => cleanChoice(s.decisionMakerRole, O.DECISION_MAKER_ROLES, 'Who approves the work', { required: true })],
        ['decisionMakerName', () => cleanText(s.decisionMakerName, O.LIMITS.shortText, 'Approver name', { required: true, readable: true })],
        ['contactMethod', () => cleanChoice(s.contactMethod, O.CONTACT_METHODS, 'Preferred contact method', { required: true })],
        ['contactPhone', () => cleanText(s.contactPhone, O.LIMITS.phone, 'Contact phone')],
        // 2 — Requirements
        ['userRoles', () => cleanUserRoles(s.userRoles)],
        ['features', (f) => cleanFeatures(s.features, f.type)],
        ['devices', () => cleanChoiceList(s.devices, O.DEVICES, 'Devices', { required: true })],
        ['languages', () => cleanChoiceList(s.languages, O.LANGUAGES, 'Languages', { required: true })],
        ['languagesOther', (f) => (f.languages.includes('Other') ? cleanText(s.languagesOther, O.LIMITS.shortText, 'Other language', { required: true, readable: true }) : { value: '' })],
        ['accessibility', () => cleanChoice(s.accessibility, O.ACCESSIBILITY, 'Accessibility', { required: true })],
        // 3 — Design
        ['designStyle', () => cleanChoice(s.designStyle, O.DESIGN_STYLES, 'Design style', { required: true })],
        ['references', () => cleanReferences(s.references)],
        ['assets', () => cleanAssets(s.assets)],
        // 4 — Development
        ['existingWebsite', () => cleanChoice(s.existingWebsite, O.EXISTING_WEBSITE, 'Existing website', { required: true })],
        ['existingWebsiteUrl', (f) => cleanUrl(s.existingWebsiteUrl, 'Existing website link', { required: f.existingWebsite !== 'No website yet' })],
        ['existingSystems', () => cleanChoiceList(s.existingSystems, O.EXISTING_SYSTEMS, 'Existing systems', { required: true })],
        ['existingSystemsOther', (f) => (f.existingSystems.includes('Other') ? cleanText(s.existingSystemsOther, O.LIMITS.shortText, 'Existing systems (other)', { required: true, readable: true }) : { value: '' })],
        ['dataMigration', () => cleanChoice(s.dataMigration, O.DATA_MIGRATION, 'Existing data to move', { required: true })],
        ['hostingPreference', () => cleanChoice(s.hostingPreference, O.HOSTING_PREFERENCE, 'Hosting', { required: true })],
        ['contentProvider', () => cleanChoice(s.contentProvider, O.CONTENT_PROVIDER, 'Who provides content', { required: true })],
        ['integrations', () => cleanChoiceList(s.integrations, O.INTEGRATIONS, 'Integrations')],
        // 5 — Testing
        ['uatTesters', () => cleanChoiceList(s.uatTesters, O.UAT_TESTERS, 'Who will test', { required: true })],
        ['testData', () => cleanChoice(s.testData, O.TEST_DATA, 'Test data', { required: true })],
        ['acceptanceMethod', () => cleanChoice(s.acceptanceMethod, O.ACCEPTANCE_METHOD, 'How you will accept the work', { required: true })],
        // 6 — Deployment
        ['launchApproach', () => cleanChoice(s.launchApproach, O.LAUNCH_APPROACH, 'Launch approach', { required: true })],
        ['trainingNeeds', () => cleanChoice(s.trainingNeeds, O.TRAINING_NEEDS, 'Training', { required: true })],
        // 7 — Maintenance
        ['contentMaintainer', () => cleanChoice(s.contentMaintainer, O.CONTENT_MAINTAINER, 'Who updates content after launch', { required: true })],
        ['supportLevel', () => cleanChoice(s.supportLevel, O.SUPPORT_LEVEL, 'Support after launch', { required: true })],
        ['updateFrequency', () => cleanChoice(s.updateFrequency, O.UPDATE_FREQUENCY, 'How often content changes', { required: true })],
        // Optional closing note — the only open field, short and checked for readability.
        ['notes', () => cleanText(s.notes, O.LIMITS.notes, 'Anything else', { readable: true })]
    ]);
}

// Feature request on an existing project: closed kind/outcomes plus one short summary line.
function validateRequestInput(body, project) {
    const s = body && typeof body === 'object' ? body : {};
    const featureLabels = ['General (not tied to one feature)', ...((project && project.features) || []).map((feature) => feature.customTitle || feature.label || feature.title).filter(Boolean)];
    const roleLabels = ['All users', ...((project && project.userRoles) || []).map((role) => role.roleOther || role.role || role.name).filter(Boolean)];
    return runSteps([
        ['kind', () => cleanChoice(s.kind, O.REQUEST_KINDS, 'What kind of request', { required: true })],
        ['relatedFeature', () => cleanChoice(s.relatedFeature, featureLabels, 'Which feature it concerns', { required: true })],
        ['userRole', () => cleanChoice(s.userRole, roleLabels, 'Who it is for', { required: true })],
        ['summary', () => cleanText(s.summary, O.LIMITS.requestSummary, 'One-line summary', { required: true, minWords: O.MIN_WORDS.requestSummary, readable: true })],
        ['outcomes', () => cleanChoiceList(s.outcomes, O.REQUEST_OUTCOMES, 'What should be true when it is done', { required: true })],
        ['outcomesOther', (f) => (f.outcomes.includes('Other') ? cleanText(s.outcomesOther, O.LIMITS.shortText, 'Other outcome', { required: true, readable: true }) : { value: '' })],
        ['example', () => cleanText(s.example, O.LIMITS.requestExample, 'Example', { readable: true })],
        ['priority', () => (s.priority === undefined || s.priority === '' ? { value: 'normal' } : cleanChoice(s.priority, O.REQUEST_PRIORITIES, 'Priority'))],
        ['targetDate', () => cleanDate(s.targetDate, 'Target date')],
        ['budgetRange', () => cleanChoice(s.budgetRange, O.BUDGET_RANGES, 'Budget range')]
    ]);
}

// Lenient validation for legacy public briefs converted by Admin (they predate the closed form).
function validateLegacyProjectInput(body) {
    const s = body && typeof body === 'object' ? body : {};
    return runSteps([
        ['name', () => cleanText(s.name, 160, 'Project name', { required: true })],
        ['type', () => cleanChoice(s.type, O.PROJECT_TYPES, 'Project type')],
        ['summary', () => cleanText(s.summary, 5000, 'Project description', { required: true })],
        ['problem', () => cleanText(s.problem, 5000, 'Problem or opportunity')],
        ['outcome', () => cleanText(s.outcome, 5000, 'Definition of success')],
        ['audience', () => cleanText(s.audience, 5000, 'Audience')],
        ['userTasks', () => cleanText(s.userTasks, 5000, 'Typical user tasks')],
        ['mustHaves', () => cleanText(s.mustHaves, 5000, 'Must-have features')],
        ['reviewers', () => cleanText(s.reviewers, 160, 'Reviewers')],
        ['integrations', () => cleanChoiceList(s.integrations, O.INTEGRATIONS, 'integrations')],
        ['targetDate', () => cleanDate(s.targetDate, 'Target date')],
        ['timelineFlexibility', () => cleanChoice(s.timelineFlexibility, O.TIMELINE_FLEXIBILITY, 'Timeline flexibility')],
        ['budgetRange', () => cleanChoice(s.budgetRange, O.BUDGET_RANGES, 'Budget range')],
        ['otherDetails', () => cleanText(s.otherDetails, 5000, 'Other details')]
    ]);
}

module.exports = { validateProjectInput, validateLegacyProjectInput, validateRequestInput, cleanText, cleanChoice, isReadableText };
