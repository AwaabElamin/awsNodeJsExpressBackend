// Automatic project planner. Turns a validated project request into a proposed plan with phases, defaults for
// "not sure" / over-ticked answers, and micro tasks per feature and per SDLC phase — without an admin round-trip.
const O = require('./clientProjectOptions');

const DAYS_PER_POINT = 2;        // indicative working days per scope point
const BASE_DAYS = 5;             // discovery, setup, design direction
const UNCAPPED_PHASE_POINTS = 22; // phase size when the budget range is open ("Need guidance" / "Prefer to discuss")

// Micro tasks per catalogue feature, grouped by SDLC stage. Keep them small and verifiable.
const FEATURE_TASKS = {
    pages_basic: { design: ['Agree the page list and a one-line purpose for each page', 'Design the page layouts (desktop and mobile)'], build: ['Build the pages', 'Load the client content into each page'], test: ['Review every page on a phone and a desktop'] },
    catalogue: { design: ['Define product fields (name, price, photos, category, availability)', 'Design the product list and product detail pages'], build: ['Build the product list with search and filters', 'Build the product admin (add, edit, hide)', 'Import the first batch of products'], test: ['Check search, filters and photos on mobile'] },
    ordering: { design: ['Define the order flow: cart → checkout → confirmation', 'Design cart and checkout screens'], build: ['Build cart and checkout', 'Send order confirmations to customer and owner'], test: ['Place test orders end-to-end including a failed one'] },
    booking: { design: ['Define what can be booked, durations and working hours', 'Design the slot picker and confirmation'], build: ['Build availability, booking and confirmation', 'Build cancel / reschedule'], test: ['Prove double-booking is impossible'] },
    payments: { design: ['Client opens the payment provider account(s)', 'Define what happens on success, failure and refund'], build: ['Build the payment step with the chosen provider', 'Record payment status against the order or booking'], test: ['Run sandbox payments for each method', 'Switch to live keys and make one real test payment'] },
    accounts: { design: ['Decide the sign-in method and profile fields'], build: ['Build register, sign in, password reset', 'Build the profile page'], test: ['Security check: password rules, session expiry, reset flow'] },
    contact: { design: ['Define the form fields and who receives enquiries'], build: ['Build the form with spam protection', 'Route enquiries to the chosen channels'], test: ['Send test enquiries and confirm they arrive'] },
    whatsapp: { design: ['Confirm the WhatsApp number and response hours'], build: ['Add the WhatsApp / chat button'], test: ['Test the button on Android and iPhone'] },
    notifications: { design: ['List the events that trigger a message and write the templates'], build: ['Configure the sending provider(s)', 'Build sending with a delivery log'], test: ['Trigger each event and confirm delivery'] },
    gallery: { design: ['Collect photos / videos and agree the grouping'], build: ['Build the gallery with optimised images'], test: ['Check load speed on mobile data'] },
    blog: { design: ['Define post structure (title, image, body, date)'], build: ['Build post list, post page and the editor'], test: ['Publish a test post and check sharing previews'] },
    multilang: { design: ['Agree who provides translations and the fallback language'], build: ['Build the language switch and right-to-left layout', 'Load translations'], test: ['Review every page in each language'] },
    maps: { design: ['Confirm locations or tracking data source'], build: ['Integrate the map / tracking view'], test: ['Test on mobile with location permissions'] },
    reviews: { design: ['Decide whether reviews are moderated before showing'], build: ['Build review submission and display'], test: ['Seed initial testimonials and test moderation'] },
    cms: { design: ['List exactly which content the client will edit'], build: ['Build the editing screens'], test: ['Client edits a page without help'] },
    orders_admin: { design: ['Define order / booking statuses and who handles each'], build: ['Build the staff list, detail and status change screens', 'Notify the customer on status change'], test: ['Walk an order from new to completed'] },
    inventory: { design: ['Define stock fields and locations'], build: ['Build stock adjustments', 'Reduce stock when an order is placed', 'Low-stock alerts'], test: ['Stock report matches a manual count'] },
    invoicing: { design: ['Agree the invoice / quote template and numbering'], build: ['Generate PDF invoices or quotes', 'Email delivery'], test: ['Compare a generated invoice with the client\'s current one'] },
    reports: { design: ['Pick the reports and period filters that matter'], build: ['Build the dashboard and reports', 'Export to Excel / CSV'], test: ['Reconcile a report against known numbers'] },
    roles: { design: ['Write the roles-and-permissions matrix'], build: ['Build role management and enforce permissions'], test: ['Confirm each role sees only what it should'] },
    documents: { design: ['Define allowed file types, sizes and who can see them'], build: ['Build upload and storage with virus / size checks'], test: ['Upload each allowed type and one disallowed type'] },
    import_export: { design: ['Agree the file formats and field mapping'], build: ['Build import with validation and error report', 'Build export'], test: ['Round-trip a real file'] },
    integration_existing: { design: ['Client provides access to the existing system', 'Map the fields between the systems'], build: ['Build the sync and error handling'], test: ['Run the sync on real sample data'] },
    offline: { design: ['Define what must work without internet'], build: ['Build local storage and sync'], test: ['Test with the connection switched off and on'] },
    other: { design: ['Clarify the feature in the kickoff call and write a mini spec'], build: ['Estimate and build the feature'], test: ['Test against the mini spec'] }
};

// Which features the different capabilities need, inverted to infer role capabilities from chosen features.
const FEATURE_TO_CUSTOMER_CAPABILITIES = {
    pages_basic: ['Browse information or a catalogue'], catalogue: ['Browse information or a catalogue', 'Search and filter'], ordering: ['Place an order'],
    booking: ['Book an appointment or reservation'], payments: ['Pay online'], accounts: ['Create an account and sign in'],
    contact: ['Send a message or enquiry'], whatsapp: ['Send a message or enquiry'], notifications: ['Receive notifications (email, SMS, WhatsApp)'], documents: ['Upload documents or photos']
};
const FEATURE_TO_STAFF_CAPABILITIES = {
    cms: ['Add or edit content and listings'], orders_admin: ['Approve or process orders and bookings'], inventory: ['Add or edit content and listings'],
    reports: ['View reports and statistics'], roles: ['Manage other users and permissions'], import_export: ['Export data'], invoicing: ['Approve or process orders and bookings']
};

const catalogueEntry = (key) => O.FEATURE_CATALOGUE.find((feature) => feature.key === key);
const label = (feature) => feature.customTitle || feature.label || (catalogueEntry(feature.key) || {}).label || feature.key;
const weight = (feature) => O.FEATURE_WEIGHTS[feature.key] || 3;
const PRIORITY_RANK = { must: 0, should: 1, could: 2 };

// Resolve over-ticked or "not sure" detail answers to a sensible default and record the assumption.
function resolveDetails(feature, assumptions) {
    const entry = catalogueEntry(feature.key);
    if (!entry || !entry.detailOptions) return feature.details || [];
    let details = (feature.details || []).filter((detail) => entry.detailOptions.includes(detail));
    const real = entry.detailOptions.filter((option) => !O.EXCLUSIVE_DETAILS.includes(option));
    if (details.includes('All of these')) details = real;
    if (details.includes('Not sure') || !details.length) {
        const preferred = { accounts: ['Email and password'], notifications: ['Email', 'WhatsApp'], contact: ['Email', 'WhatsApp'], payments: ['Bank transfer', 'Cash on delivery or at location'] }[feature.key] || [real[0]];
        details = preferred.filter((option) => real.includes(option));
        assumptions.push(`${entry.label}: you were not sure about "${entry.detailQuestion}", so we assumed ${details.join(' + ')}.`);
    }
    const max = entry.maxDetails || details.length;
    if (details.length > max) {
        const preferred = { accounts: ['Email and password'], notifications: ['Email', 'WhatsApp'], contact: ['Email', 'WhatsApp'], booking: [details[0]] }[feature.key];
        const trimmed = (preferred || details).filter((option) => details.includes(option)).slice(0, max);
        assumptions.push(`${entry.label}: ${details.length} answers were ticked for "${entry.detailQuestion}"; version 1 starts with ${trimmed.join(' + ')}.`);
        details = trimmed;
    }
    return details;
}

// Add the feature the primary goal needs when it is missing (as "should", so it still lands in phase 1 if it fits).
function ensureGoalFeature(project, features, assumptions) {
    const required = O.GOAL_REQUIRES_FEATURE[project.primaryGoal] || [];
    if (!required.length || features.some((feature) => required.includes(feature.key))) return features;
    const key = required.includes('catalogue') ? 'catalogue' : required[0];
    const entry = catalogueEntry(key);
    assumptions.push(`Your main goal is "${project.primaryGoal}" but no feature delivered it, so we added "${entry.label}" to the plan.`);
    return [...features, { key, label: entry.label, customTitle: '', priority: 'should', details: entry.detailOptions ? [entry.detailOptions[0]] : [], inferred: true }];
}

// Infer missing user types from the features so developers know who the system serves.
function ensureRoles(project, features, assumptions) {
    const roles = (project.userRoles || []).filter((role) => role.role).map((role) => ({ ...role, inferred: false }));
    const kinds = new Set(roles.map((role) => role.role));
    const keys = features.map((feature) => feature.key);
    const hasCustomer = O.CUSTOMER_ROLES.some((role) => kinds.has(role)) || kinds.has('Other');
    const hasStaff = O.STAFF_ROLES.some((role) => kinds.has(role)) || kinds.has('Other');
    if (!hasCustomer && keys.some((key) => O.CUSTOMER_FACING_FEATURES.includes(key))) {
        const role = keys.includes('accounts') ? 'Registered customer or member' : 'Customer or visitor (no account)';
        const capabilities = [...new Set(keys.flatMap((key) => FEATURE_TO_CUSTOMER_CAPABILITIES[key] || []))].slice(0, O.MAX_CHOICES.capabilities);
        roles.push({ role, roleOther: '', count: 'Not sure', capabilities, inferred: true });
        assumptions.push(`No customer user type was listed, but the features are customer-facing, so we added "${role}".`);
    }
    if (!hasStaff && keys.some((key) => O.BACK_OFFICE_FEATURES.includes(key))) {
        const capabilities = [...new Set(keys.flatMap((key) => FEATURE_TO_STAFF_CAPABILITIES[key] || []))].slice(0, O.MAX_CHOICES.capabilities);
        roles.push({ role: 'Manager or owner', roleOther: '', count: '1–10', capabilities, inferred: true });
        assumptions.push('No staff user type was listed, but some features are for your team, so we added "Manager or owner".');
    }
    return roles;
}

// Split features into phases that fit the budget. Goal-delivering and must-have features go first.
function splitPhases(project, features) {
    const limit = O.BUDGET_SCOPE_LIMITS[project.budgetRange] || UNCAPPED_PHASE_POINTS;
    const goalKeys = O.GOAL_REQUIRES_FEATURE[project.primaryGoal] || [];
    const anchors = new Set(['pages_basic', 'contact']);
    const ordered = [...features].sort((a, b) => {
        const score = (feature) => (goalKeys.includes(feature.key) ? 0 : anchors.has(feature.key) ? 1 : 2) * 10 + PRIORITY_RANK[feature.priority] * 3 + weight(feature) / 10;
        return score(a) - score(b);
    });
    const phases = [];
    let current = { number: 1, features: [], points: 0 };
    for (const feature of ordered) {
        const points = weight(feature);
        if (current.features.length && current.points + points > limit) {
            phases.push(current);
            current = { number: phases.length + 1, features: [], points: 0 };
        }
        current.features.push(feature);
        current.points += points;
    }
    phases.push(current);
    return phases.map((phase) => ({
        ...phase,
        workingDays: (phase.number === 1 ? BASE_DAYS : 2) + phase.points * DAYS_PER_POINT,
        budgetFit: phase.number === 1 ? (O.BUDGET_SCOPE_LIMITS[project.budgetRange] ? project.budgetRange : suggestRange(phase.points)) : suggestRange(phase.points)
    }));
}

function suggestRange(points) {
    const found = Object.entries(O.BUDGET_SCOPE_LIMITS).find(([, max]) => points <= max);
    return found ? found[0] : 'Over $25,000';
}

const notSure = (value) => !value || /not sure/i.test(value);

// Cross-cutting micro tasks derived from the SDLC answers, with defaults where the client was unsure.
function sdlcTasks(project, phase1, assumptions) {
    const assets = project.assets || {};
    const need = (item) => assets[item] === 'need';
    const unsure = (item) => assets[item] === 'not_sure' || !assets[item];
    const tasks = {
        planning: ['30-minute kickoff call to confirm the Phase 1 scope and this plan', 'Confirm the approver and the preferred contact channel'],
        design: [],
        development: [],
        testing: [],
        deployment: [],
        maintenance: []
    };
    if (notSure(project.designStyle)) { tasks.design.push('Present three style directions and let the approver pick one'); assumptions.push('Design style was "not sure"; we will present three directions to choose from.'); }
    else tasks.design.push(`Create a style board in the "${project.designStyle}" direction`);
    if (need('logo') || unsure('logo')) tasks.design.push(need('logo') ? 'Design a logo (two concepts, one revision round)' : 'Confirm whether a logo exists; design one if not');
    if (need('brandColors') || unsure('brandColors')) tasks.design.push('Define brand colours and fonts');
    tasks.design.push('Wireframe the key screens of Phase 1', 'Design review with the approver and sign-off');
    if (phase1.some((feature) => feature.key === 'multilang') || (project.languages || []).length > 1) tasks.design.push('Agree translation ownership for each language');

    tasks.development.push(notSure(project.hostingPreference) || project.hostingPreference === O.HOSTING_PREFERENCE[0] ? 'Set up hosting on Awaaab LLC infrastructure' : 'Get access to the client hosting / cloud account and set it up');
    if (need('domain') || unsure('domain')) tasks.development.push(need('domain') ? 'Register the domain name' : 'Confirm domain ownership and get DNS access');
    else tasks.development.push('Get DNS access to the existing domain');
    if (project.contentProvider === O.CONTENT_PROVIDER[0]) tasks.development.push('Client delivers all text and photos before build starts (checklist provided)');
    else if (project.contentProvider === O.CONTENT_PROVIDER[1]) tasks.development.push('Client delivers available content; Awaaab LLC writes the rest');
    else tasks.development.push('Awaaab LLC creates all text and sources photos');
    if (need('text') || unsure('text')) tasks.development.push('Content checklist: what text exists and what must be written');
    if (need('photos') || unsure('photos')) tasks.development.push('Photo plan: existing photos, stock photos, or a photo session');
    if (project.dataMigration && project.dataMigration.startsWith('Yes')) tasks.development.push('Export existing data and map it to the new system', 'Import and verify the migrated data');
    if ((project.integrations || []).length) tasks.development.push(`Set up integrations: ${project.integrations.join(', ')}`);
    tasks.development.push('Weekly progress update to the approver');

    const testers = (project.uatTesters || []).length ? project.uatTesters : ['Me'];
    if (notSure(project.testData)) { assumptions.push('Test data was "not sure"; we will test with made-up data unless you send real samples.'); }
    tasks.testing.push(`Write the acceptance checklist from the Phase 1 features`, `User acceptance testing by: ${testers.join(', ')}`, notSure(project.testData) ? 'Prepare made-up test data' : project.testData === O.TEST_DATA[0] ? 'Client provides real sample data for testing' : 'Prepare made-up test data', 'Fix round after UAT');
    if (notSure(project.acceptanceMethod)) { tasks.testing.push('Acceptance: demo session plus signed checklist'); assumptions.push('Acceptance method was "not sure"; we will do a demo session and a signed checklist.'); }
    else tasks.testing.push(`Acceptance: ${project.acceptanceMethod.toLowerCase()}`);
    if (/Required/.test(project.accessibility || '')) tasks.testing.push('Accessibility check (contrast, keyboard, screen reader)');

    if (notSure(project.launchApproach)) { tasks.deployment.push('Soft launch to a small group, then public launch'); assumptions.push('Launch approach was "not sure"; we recommend a soft launch first.'); }
    else tasks.deployment.push(project.launchApproach);
    tasks.deployment.push('Go-live checklist: domain, SSL, backups, monitoring, analytics');
    if (project.trainingNeeds && project.trainingNeeds !== O.TRAINING_NEEDS[0]) tasks.deployment.push(project.trainingNeeds);
    tasks.deployment.push('Handover: credentials, documentation, support contact');

    tasks.maintenance.push(project.supportLevel || O.SUPPORT_LEVEL[1]);
    tasks.maintenance.push(`Content updates: ${project.contentMaintainer || O.CONTENT_MAINTAINER[0]} (${project.updateFrequency || 'as needed'})`);
    tasks.maintenance.push('Monthly backup and security update check');
    return tasks;
}

function buildPlan(project, { now = new Date() } = {}) {
    if (!project || !project.primaryGoal) return null; // legacy free-text projects cannot be planned automatically
    const assumptions = [];
    let features = (project.features || []).filter((feature) => feature.key).map((feature) => {
        // Older records may hold a catalogue feature under "other"; map it so it gets the right tasks and weight.
        const match = feature.key === 'other' && feature.customTitle
            ? O.FEATURE_CATALOGUE.find((entry) => entry.key !== 'other' && entry.label.toLowerCase() === feature.customTitle.trim().toLowerCase())
            : null;
        return match ? { ...feature, key: match.key, label: match.label, customTitle: '', inferred: false } : { ...feature, inferred: false };
    });
    features = features.map((feature) => ({ ...feature, details: resolveDetails(feature, assumptions) }));
    features = ensureGoalFeature(project, features, assumptions);
    if (features.length >= 4 && features.every((feature) => feature.priority === 'must')) {
        assumptions.push('Every feature was marked "Must have"; we ordered them by how directly they serve your main goal.');
    }
    const roles = ensureRoles(project, features, assumptions);
    const phases = splitPhases(project, features);
    const phase1 = phases[0];
    const tasks = sdlcTasks(project, phase1.features, assumptions);
    const totalPoints = features.filter((feature) => feature.priority !== 'could').reduce((total, feature) => total + weight(feature), 0);
    const fullScopeRange = suggestRange(totalPoints);
    const budgetCapped = !!O.BUDGET_SCOPE_LIMITS[project.budgetRange];

    const timeline = { workingDays: phase1.workingDays, weeks: Math.ceil(phase1.workingDays / 5), fitsTargetDate: null, targetDate: project.targetDate || null };
    if (project.targetDate) {
        const available = Math.floor((new Date(project.targetDate).getTime() - now.getTime()) / 86400000) * 5 / 7;
        timeline.fitsTargetDate = available >= phase1.workingDays;
        if (!timeline.fitsTargetDate) assumptions.push(`Phase 1 needs about ${timeline.weeks} weeks; the target date leaves about ${Math.max(0, Math.round(available / 5))} weeks. Either the date moves or Phase 1 shrinks.`);
    }

    const decisions = [{ key: 'accept_phase1', label: `Accept the Phase 1 plan (${phase1.features.length} feature${phase1.features.length === 1 ? '' : 's'}, about ${timeline.weeks} weeks, fits "${phase1.budgetFit}")` }];
    if (phases.length > 1) {
        decisions.push({ key: 'full_scope', label: `I want everything in one go — budget range "${fullScopeRange}"`, budgetRange: fullScopeRange });
    }
    decisions.push({ key: 'discuss', label: 'I would like to discuss this before deciding' });

    return {
        version: 1,
        generatedAt: now,
        summary: {
            type: project.type,
            goal: project.primaryGoal === 'Other' ? project.primaryGoalOther : project.primaryGoal,
            audience: roles.map((role) => `${role.roleOther || role.role}${role.inferred ? ' (assumed)' : ''}`),
            languages: project.languages || [],
            devices: project.devices || [],
            budgetRange: project.budgetRange,
            budgetCapped,
            fullScopeRange,
            totalPoints
        },
        roles,
        phases: phases.map((phase) => ({
            number: phase.number,
            title: phase.number === 1 ? 'Phase 1 — first version' : `Phase ${phase.number} — later`,
            points: phase.points,
            workingDays: phase.workingDays,
            budgetFit: phase.budgetFit,
            features: phase.features.map((feature) => ({
                key: feature.key,
                label: label(feature),
                priority: feature.priority,
                details: feature.details || [],
                inferred: !!feature.inferred,
                tasks: FEATURE_TASKS[feature.key] || FEATURE_TASKS.other
            }))
        })),
        sdlcTasks: tasks,
        assumptions,
        timeline,
        decisions
    };
}

// Flat task list (for the developer brief and for counting).
function flattenTasks(plan) {
    if (!plan) return [];
    const rows = [];
    for (const [stage, items] of Object.entries(plan.sdlcTasks || {})) items.forEach((task) => rows.push({ stage, scope: 'project', task }));
    for (const phase of plan.phases || []) {
        for (const feature of phase.features) {
            for (const [stage, items] of Object.entries(feature.tasks || {})) items.forEach((task) => rows.push({ stage, scope: `Phase ${phase.number} · ${feature.label}`, task }));
        }
    }
    return rows;
}

module.exports = { buildPlan, flattenTasks, FEATURE_TASKS };
