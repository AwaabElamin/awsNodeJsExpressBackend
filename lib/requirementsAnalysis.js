// Requirements analysis generated when Admin confirms the automatic plan. Produces an SRS-style document
// (scope, user stories, functional + non-functional requirements, data, delivery, risks) from the project and plan.
const O = require('./clientProjectOptions');
const { FEATURE_TASKS } = require('./projectPlanner');

// Functional requirement templates per feature. `{details}` is replaced with the resolved detail answers.
const FEATURE_REQUIREMENTS = {
    pages_basic: ['The system shall provide the following public pages: {details}.', 'Each page shall be editable by Awaaab LLC during the project and by the client where the admin dashboard is in scope.', 'Pages shall render correctly on mobile and desktop.'],
    catalogue: ['The system shall list products/services with name, price, photos, category and availability.', 'Visitors shall be able to search and filter the catalogue.', 'Staff shall add, edit and hide items. Expected size at launch: {details}.'],
    ordering: ['Customers shall add items to a cart and place an order with contact and delivery details.', 'Fulfilment options: {details}.', 'The customer and the owner shall receive an order confirmation.'],
    booking: ['Customers shall see available slots and book: {details}.', 'The system shall prevent double booking of the same slot.', 'Customers shall be able to cancel or reschedule within the rules agreed at kickoff.'],
    payments: ['Customers shall pay online using: {details}.', 'The system shall record payment status (pending, paid, failed, refunded) against the order or booking.', 'Live payments are enabled only after a successful sandbox test and client approval.'],
    accounts: ['Users shall register and sign in using: {details}.', 'Users shall reset a forgotten password and edit their profile.', 'Sessions shall expire and passwords shall follow a minimum policy.'],
    contact: ['Visitors shall send an enquiry through a form with spam protection.', 'Enquiries shall be delivered to: {details}.'],
    whatsapp: ['Visitors shall start a WhatsApp chat from any page via a visible button.'],
    notifications: ['The system shall send notifications for the agreed events via: {details}.', 'Every notification shall be logged with its delivery result.'],
    gallery: ['The system shall display a photo/video gallery with optimised media.'],
    blog: ['Staff shall publish posts with title, image, body and date; visitors shall read them.'],
    multilang: ['All public content shall be available in each supported language with a language switch and right-to-left layout where applicable.'],
    maps: ['The system shall show the agreed locations or tracking on a map.'],
    reviews: ['Customers shall submit reviews; staff shall moderate before publication if agreed.'],
    cms: ['Staff shall edit the agreed content without developer help.'],
    orders_admin: ['Staff shall view, confirm and update orders/bookings through the agreed statuses: {details}.', 'Customers shall be notified when the status changes.'],
    inventory: ['The system shall track stock: {details}.', 'Stock levels shall be reportable and adjustable by staff.'],
    invoicing: ['The system shall generate numbered invoices/quotes as PDF and send them by email.'],
    reports: ['Staff shall view reports: {details}, filterable by period, and export them.'],
    roles: ['The system shall enforce the agreed roles-and-permissions matrix.'],
    documents: ['Users shall upload documents/photos of the allowed types and sizes; access follows the agreed visibility rules.'],
    import_export: ['Staff shall import and export data in the agreed file formats with validation.'],
    integration_existing: ['The system shall exchange data with: {details}, with error handling and a sync log.'],
    offline: ['The agreed functions shall work without internet and synchronise when connectivity returns.'],
    other: ['Requirement to be specified at kickoff (client-named feature).']
};

// Capability → user-story template.
const STORY_TEMPLATES = {
    'Browse information or a catalogue': 'browse the information or catalogue so that I can decide what I need',
    'Search and filter': 'search and filter so that I find the right item quickly',
    'Create an account and sign in': 'create an account and sign in so that my details and history are saved',
    'Place an order': 'place an order so that I can buy without calling',
    'Book an appointment or reservation': 'book a slot so that I do not have to call or wait',
    'Pay online': 'pay online so that my order or booking is confirmed immediately',
    'Send a message or enquiry': 'send an enquiry so that I get an answer through my preferred channel',
    'Upload documents or photos': 'upload documents or photos so that the business has what it needs from me',
    'Receive notifications (email, SMS, WhatsApp)': 'receive confirmations and reminders so that I do not miss anything',
    'Add or edit content and listings': 'add and edit content so that the information stays current without a developer',
    'Approve or process orders and bookings': 'process orders and bookings so that nothing is lost or doubled',
    'View reports and statistics': 'see reports so that I can make decisions on real numbers',
    'Manage other users and permissions': 'manage users and permissions so that each person sees only what they should',
    'Export data': 'export data so that I can use it in other tools'
};

// Data entities implied by features.
const FEATURE_ENTITIES = {
    pages_basic: ['Page'], catalogue: ['Product / Service', 'Category'], ordering: ['Order', 'Order line', 'Customer'], booking: ['Booking', 'Resource / Staff member', 'Availability'],
    payments: ['Payment'], accounts: ['User account', 'Profile'], contact: ['Enquiry'], notifications: ['Notification log'], gallery: ['Media item'], blog: ['Post'],
    reviews: ['Review'], orders_admin: ['Order status history'], inventory: ['Stock item', 'Stock movement', 'Location'], invoicing: ['Invoice / Quote'], reports: ['Report snapshot'],
    roles: ['Role', 'Permission'], documents: ['Document'], import_export: ['Import job'], integration_existing: ['Sync log'], maps: ['Location']
};

const fill = (template, details) => template.replace('{details}', details && details.length ? details.join(', ') : 'to be confirmed at kickoff');
const roleName = (role) => role.roleOther || role.role || role.name || 'User';

function buildAnalysis(project, plan, { now = new Date(), confirmedBy = '' } = {}) {
    if (!project || !plan) return null;
    const phase1 = plan.phases[0];
    const later = plan.phases.slice(1);
    const phase1Keys = new Set(phase1.features.map((feature) => feature.key));

    // 1 — Purpose and scope
    const scope = {
        goal: plan.summary.goal,
        business: [project.industry === 'Other' ? project.industryOther : project.industry, project.businessSize, project.country === 'Other' ? project.countryOther : project.country].filter(Boolean).join(' · '),
        problems: project.painPoints || [],
        successMeasures: project.successMeasures || [],
        inScope: phase1.features.map((feature) => `${feature.label}${feature.details.length ? ` (${feature.details.join(', ')})` : ''}`),
        outOfScope: later.flatMap((phase) => phase.features.map((feature) => `${feature.label} — ${phase.title}`)),
        constraints: [
            `Budget range: ${project.budgetRange}${plan.summary.budgetCapped ? '' : ' (to be agreed)'}`,
            project.targetDate ? `Target date: ${new Date(project.targetDate).toISOString().slice(0, 10)} (${project.timelineFlexibility || 'flexibility not stated'})` : 'No target date given',
            `Languages: ${(project.languages || []).join(', ') || 'not stated'}`,
            `Devices: ${(project.devices || []).join(', ') || 'not stated'}`
        ]
    };

    // 2 — Stakeholders and user stories
    const stakeholders = {
        approver: [project.decisionMakerName || project.reviewers, project.decisionMakerRole].filter(Boolean).join(' — ') || 'not stated',
        contact: [project.contactMethod, project.contactPhone].filter(Boolean).join(' · ') || 'not stated',
        testers: project.uatTesters || []
    };
    const stories = [];
    let storyIndex = 1;
    for (const role of plan.roles) {
        for (const capability of role.capabilities || []) {
            const template = STORY_TEMPLATES[capability];
            if (template) stories.push({ id: `US-${storyIndex++}`, role: roleName(role), story: `As a ${roleName(role).toLowerCase()}, I want to ${template}.`, inferred: !!role.inferred });
        }
    }

    // 3 — Functional requirements with acceptance criteria (Phase 1 only; later phases listed as deferred)
    const functional = phase1.features.map((feature, index) => {
        const templates = FEATURE_REQUIREMENTS[feature.key] || FEATURE_REQUIREMENTS.other;
        return {
            id: `FR-${index + 1}`,
            feature: feature.label,
            priority: feature.priority,
            inferred: !!feature.inferred,
            requirements: templates.map((template, i) => ({ id: `FR-${index + 1}.${i + 1}`, text: fill(template, feature.details) })),
            acceptance: (FEATURE_TASKS[feature.key] || FEATURE_TASKS.other).test
        };
    });
    const deferred = later.flatMap((phase) => phase.features.map((feature) => `${feature.label} (${phase.title})`));

    // 4 — Non-functional requirements
    const nonFunctional = [];
    if ((project.languages || []).length > 1) nonFunctional.push(`Localisation: all user-facing text in ${project.languages.join(' and ')}${project.languages.includes('Arabic') ? ', with right-to-left layout for Arabic' : ''}.`);
    nonFunctional.push(`Responsive on: ${(project.devices || ['Desktop web', 'Mobile web']).join(', ')}.`);
    nonFunctional.push(/Required/.test(project.accessibility || '') ? 'Accessibility: WCAG AA (contrast, keyboard navigation, screen-reader labels).' : 'Accessibility: standard good practice (readable contrast, labelled forms); formal WCAG audit not in scope.');
    nonFunctional.push('Performance: key pages load within 3 seconds on a typical mobile connection; images optimised.');
    if (phase1Keys.has('accounts') || phase1Keys.has('payments')) nonFunctional.push('Security: HTTPS everywhere, hashed passwords, session expiry; card data handled only by the payment provider.');
    else nonFunctional.push('Security: HTTPS everywhere, spam protection on forms, no sensitive data stored beyond enquiries.');
    nonFunctional.push(`Hosting & operations: ${project.hostingPreference || 'to be agreed'}; daily backups; uptime monitoring.`);
    nonFunctional.push('Browser support: current versions of Chrome, Safari, Firefox and Edge; Android and iOS default browsers.');
    nonFunctional.push(`Content ownership: ${project.contentProvider || 'to be agreed'}.`);

    // 5 — Data and integrations
    const entities = [...new Set(phase1.features.flatMap((feature) => FEATURE_ENTITIES[feature.key] || []))];
    const data = {
        entities,
        integrations: project.integrations || [],
        migration: project.dataMigration || 'not stated',
        existing: [project.existingWebsite, project.existingWebsiteUrl, ...(project.existingSystems || []).filter((item) => item !== 'None')].filter(Boolean)
    };

    // 6 — Design direction
    const assets = project.assets || {};
    const design = {
        style: project.designStyle || 'not stated',
        assetsHave: O.ASSET_ITEMS.filter((item) => assets[item] === 'have').map((item) => O.ASSET_LABELS[item]),
        assetsNeed: O.ASSET_ITEMS.filter((item) => assets[item] === 'need').map((item) => O.ASSET_LABELS[item]),
        assetsUnknown: O.ASSET_ITEMS.filter((item) => !assets[item] || assets[item] === 'not_sure').map((item) => O.ASSET_LABELS[item]),
        references: Array.isArray(project.references) ? project.references : []
    };

    // 7 — Delivery plan (milestones derived from the plan timeline)
    const weeks = plan.timeline.weeks;
    const milestone = (name, fraction, note) => ({ name, week: Math.max(1, Math.round(weeks * fraction)), note });
    const delivery = {
        phase1Weeks: weeks,
        milestones: [
            milestone('Kickoff and scope confirmation', 0.05, 'Confirm this analysis, collect access and content checklist'),
            milestone('Design sign-off', 0.3, plan.sdlcTasks.design[0]),
            milestone('Build complete (internal test)', 0.75, 'All Phase 1 features built and tested internally'),
            milestone('User acceptance testing', 0.9, `Testers: ${(project.uatTesters || ['Client']).join(', ')}; ${project.acceptanceMethod && !/not sure/i.test(project.acceptanceMethod) ? project.acceptanceMethod.toLowerCase() : 'demo session plus signed checklist'}`),
            milestone('Launch', 1, project.launchApproach && !/not sure/i.test(project.launchApproach) ? project.launchApproach : 'Soft launch to a small group, then public launch')
        ],
        training: project.trainingNeeds || 'not stated',
        support: project.supportLevel || 'not stated',
        maintenance: `${project.contentMaintainer || 'not stated'} · content changes ${project.updateFrequency || 'as needed'}`
    };

    // 8 — Risks and assumptions
    const risks = [];
    if (design.assetsUnknown.length >= 4) risks.push({ risk: 'Brand materials are largely unknown; design cannot start until the discovery session.', mitigation: 'Hold the discovery session in week 1; budget two logo concepts if needed.' });
    if (project.contentProvider === O.CONTENT_PROVIDER[0]) risks.push({ risk: 'All content comes from the client; late content is the most common cause of delay.', mitigation: 'Content checklist at kickoff; build proceeds with placeholders; launch date depends on content delivery.' });
    if (project.timelineFlexibility === 'Fixed date' && plan.timeline.fitsTargetDate === false) risks.push({ risk: 'The fixed target date does not fit Phase 1.', mitigation: 'Agree a smaller Phase 1 or move the date at kickoff.' });
    if (project.timelineFlexibility === 'Fixed date' && plan.timeline.fitsTargetDate) risks.push({ risk: 'Fixed date with little slack.', mitigation: 'Weekly progress updates; decisions turned around within two working days.' });
    if (later.length) risks.push({ risk: `Features deferred to later phases (${deferred.length}) may be expected at launch.`, mitigation: 'Phase boundaries are written into the agreement; later phases quoted separately.' });
    if (phase1Keys.has('payments')) risks.push({ risk: 'Payment provider onboarding depends on the client\'s business documents.', mitigation: 'Client opens the provider account in week 1; sandbox used until approved.' });
    if (project.supportLevel === O.SUPPORT_LEVEL[3] && project.budgetRange === O.BUDGET_RANGES[0]) risks.push({ risk: 'Priority support expectations exceed the project budget.', mitigation: 'Quote support as a separate monthly plan.' });

    // 9 — Open questions for the kickoff call (things the planner could not default safely)
    const openQuestions = [];
    phase1.features.filter((feature) => feature.key === 'other').forEach((feature) => openQuestions.push(`Specify "${feature.label}": what exactly should it do and for whom?`));
    if (/not sure/i.test(project.accessibility || '')) openQuestions.push('Do any users rely on screen readers or need high-contrast / keyboard-only use?');
    if (/not sure/i.test(project.designStyle || '')) openQuestions.push('Which of the three style directions should we start from?');
    if ((project.userRoles || []).some((role) => role.count === 'Not sure')) openQuestions.push('Roughly how many users of each type do you expect in the first year?');
    if (plan.roles.some((role) => role.inferred)) openQuestions.push(`Confirm the assumed user type(s): ${plan.roles.filter((role) => role.inferred).map(roleName).join(', ')}.`);
    if (phase1.features.some((feature) => feature.inferred)) openQuestions.push(`Confirm the feature(s) the plan added: ${phase1.features.filter((feature) => feature.inferred).map((feature) => feature.label).join(', ')}.`);
    if (!project.contactPhone) openQuestions.push('Best phone / WhatsApp number for quick questions during the project?');

    return {
        version: 1,
        generatedAt: now,
        confirmedBy,
        basedOnPlanVersion: plan.version,
        scope,
        stakeholders,
        stories,
        functional,
        deferred,
        nonFunctional,
        data,
        design,
        delivery,
        risks,
        assumptions: plan.assumptions,
        openQuestions
    };
}

module.exports = { buildAnalysis, FEATURE_REQUIREMENTS };
