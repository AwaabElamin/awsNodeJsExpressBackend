const assert = require('node:assert/strict');
const { test } = require('node:test');
const { buildPlan, flattenTasks } = require('../lib/projectPlanner');

// Shape of a real submission: online shop goal, staff-only role, everything "must", over-ticked details, low budget.
const hashimShop = {
    name: 'lkjui', type: 'Website', industry: 'Retail or e-commerce', businessSize: 'Just me', country: 'Sudan',
    primaryGoal: 'Sell products online', budgetRange: 'Under $2,500', targetDate: new Date('2026-12-05'), timelineFlexibility: 'Fixed date',
    userRoles: [{ role: 'Staff or employee', count: '1–10', capabilities: ['Search and filter', 'Upload documents or photos'] }],
    features: [
        { key: 'pages_basic', label: 'Basic pages (home, about, services, contact)', priority: 'must', details: ['Home', 'About us', 'Services', 'Products', 'Contact', 'Gallery', 'Pricing', 'Team', 'FAQ'] },
        { key: 'accounts', label: 'Customer accounts and sign-in', priority: 'must', details: ['Email and password', 'Phone number and code', 'Google or Apple', 'Not sure'] },
        { key: 'documents', label: 'Document or file uploads', priority: 'must', details: [] },
        { key: 'notifications', label: 'Notifications and reminders', priority: 'must', details: ['Email', 'SMS', 'WhatsApp', 'In-app push'] },
        { key: 'contact', label: 'Contact or enquiry form', priority: 'must', details: ['Email', 'WhatsApp', 'Dashboard inside the system', 'All of these'] },
        { key: 'payments', label: 'Online payments', priority: 'must', details: ['PayPal'] },
        { key: 'booking', label: 'Online booking or appointments', priority: 'must', details: ['Appointments with staff', 'Tables or seats', 'Rooms or venues', 'Vehicles or equipment', 'Classes or events'] },
        { key: 'other', label: 'Something else (name it)', customTitle: 'Stock or inventory tracking', priority: 'must', details: [] }
    ],
    devices: ['Desktop web', 'Mobile web'], languages: ['English', 'Arabic'], accessibility: 'Not sure', designStyle: 'Warm and friendly',
    assets: { logo: 'not_sure', text: 'not_sure', photos: 'not_sure', domain: 'not_sure', hosting: 'not_sure', brandColors: 'not_sure' },
    existingWebsite: 'No website yet', existingSystems: ['None'], dataMigration: 'Not sure', hostingPreference: 'Awaaab LLC hosts and manages it',
    contentProvider: 'We provide all text and photos', integrations: ['Payments or billing', 'Email or messaging', 'Scheduling or calendars'],
    uatTesters: ['Me'], testData: 'Not sure', acceptanceMethod: 'Not sure', launchApproach: 'Not sure', trainingNeeds: 'Both a session and a guide',
    contentMaintainer: 'A mix of both', supportLevel: 'Priority support with agreed response times', updateFrequency: 'Daily'
};

test('planner resolves defaults, infers roles and the goal feature, and splits scope to fit the budget', () => {
    const plan = buildPlan(hashimShop, { now: new Date('2026-11-01T12:00:00Z') });
    assert.ok(plan);
    assert.equal(plan.version, 1);

    // Goal feature added, customer role inferred.
    const allFeatures = plan.phases.flatMap((phase) => phase.features);
    const catalogue = allFeatures.find((feature) => feature.key === 'catalogue');
    assert.ok(catalogue && catalogue.inferred, 'catalogue added for "Sell products online"');
    assert.ok(plan.roles.some((role) => role.inferred && role.role === 'Registered customer or member'), 'customer role inferred because accounts is chosen');
    assert.match(plan.assumptions.join('\n'), /added "Product or service catalogue"/);
    assert.match(plan.assumptions.join('\n'), /No customer user type was listed/);

    // Over-ticked / not-sure details resolved.
    const accounts = allFeatures.find((feature) => feature.key === 'accounts');
    assert.deepEqual(accounts.details, ['Email and password']);
    const notifications = allFeatures.find((feature) => feature.key === 'notifications');
    assert.deepEqual(notifications.details, ['Email', 'WhatsApp']);
    const contact = allFeatures.find((feature) => feature.key === 'contact');
    assert.deepEqual(contact.details, ['Email', 'WhatsApp']);
    const booking = allFeatures.find((feature) => feature.key === 'booking');
    assert.equal(booking.details.length, 1);

    // Phase 1 fits "Under $2,500" (8 points) and leads with the goal feature and anchors.
    assert.ok(plan.phases.length >= 2, 'scope split into phases');
    assert.ok(plan.phases[0].points <= 8, `phase 1 points ${plan.phases[0].points} within budget`);
    assert.equal(plan.phases[0].budgetFit, 'Under $2,500');
    assert.ok(plan.phases[0].features.some((feature) => feature.key === 'catalogue'));
    assert.ok(plan.phases[0].features.some((feature) => feature.key === 'pages_basic'));
    assert.equal(plan.summary.fullScopeRange, '$5,000–$10,000');

    // Decisions offered to the client and the timeline check.
    assert.deepEqual(plan.decisions.map((decision) => decision.key), ['accept_phase1', 'full_scope', 'discuss']);
    assert.equal(plan.decisions[1].budgetRange, '$5,000–$10,000');
    assert.equal(typeof plan.timeline.weeks, 'number');
    assert.equal(plan.timeline.fitsTargetDate, true);

    // SDLC micro tasks with defaults for "not sure" answers.
    assert.match(plan.sdlcTasks.design.join('\n'), /logo/i);
    assert.match(plan.sdlcTasks.testing.join('\n'), /made-up test data/);
    assert.match(plan.sdlcTasks.deployment.join('\n'), /Soft launch/);
    assert.match(plan.sdlcTasks.maintenance.join('\n'), /Priority support/);
    const tasks = flattenTasks(plan);
    assert.ok(tasks.length > 30, `expected a rich micro-task list, got ${tasks.length}`);
    assert.ok(tasks.some((row) => /double-booking/.test(row.task)));
    assert.ok(tasks.some((row) => /Low-stock alerts/.test(row.task)), 'the "other" stock feature is mapped to the inventory tasks');
});

test('planner returns null for legacy free-text projects and a single phase when the budget covers everything', () => {
    assert.equal(buildPlan({ name: 'old', summary: 'free text' }), null);
    const small = { ...hashimShop, budgetRange: '$10,000–$25,000', targetDate: null };
    const plan = buildPlan(small, { now: new Date('2026-11-01') });
    assert.equal(plan.phases.length, 1);
    assert.deepEqual(plan.decisions.map((decision) => decision.key), ['accept_phase1', 'discuss']);
    assert.equal(plan.timeline.fitsTargetDate, null);
});
