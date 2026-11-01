const assert = require('node:assert/strict');
const { test } = require('node:test');
const mongoose = require('mongoose');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-only-secret';

function mockModule(name, exports) {
    const filename = require.resolve(name);
    require.cache[filename] = { id: filename, filename, loaded: true, exports };
}

const ids = {
    client: new mongoose.Types.ObjectId(),
    otherClient: new mongoose.Types.ObjectId(),
    visitor: new mongoose.Types.ObjectId(),
    project: new mongoose.Types.ObjectId(),
    request: new mongoose.Types.ObjectId(),
    brief: new mongoose.Types.ObjectId(),
    convertedBrief: new mongoose.Types.ObjectId()
};
const accounts = {
    client: { _id: ids.client, email: 'client@example.invalid', role: 'Client', firstname: 'Cleo', lastname: 'Client', isActive: true },
    otherClient: { _id: ids.otherClient, email: 'other@example.invalid', role: 'Client', isActive: true },
    visitor: { _id: ids.visitor, email: 'visitor@example.invalid', role: 'Visitors', isActive: true }
};
const store = { projects: [], briefs: {} };
const calls = { adminUpdates: [], requestUpdates: [], converted: [] };

function ownedProject(id, ownerId) {
    return store.projects.find((project) => String(project._id) === String(id) && String(project.ownerId) === String(ownerId)) || null;
}

mockModule('../models/users', {
    findByEmail: async (email) => Object.values(accounts).find((account) => account.email === email) || null,
    getManagedAccountForAdmin: async (id) => Object.values(accounts).find((account) => String(account._id) === String(id)) || null
});
mockModule('../models/clientProject', {
    createForOwner: async (owner, fields) => {
        const project = { _id: ids.project, ownerId: owner._id, ownerEmail: owner.email, status: 'requested', requests: [], ...fields };
        store.projects.push(project);
        return project;
    },
    listForOwner: async (ownerId) => store.projects.filter((project) => String(project.ownerId) === String(ownerId)).map((project) => ({ _id: project._id, name: project.name, status: project.status })),
    getForOwner: async (id, ownerId) => ownedProject(id, ownerId),
    updateForOwner: async (id, ownerId, fields) => {
        const project = ownedProject(id, ownerId);
        if (!project || !['requested', 'needs_info'].includes(project.status)) return null;
        Object.assign(project, fields, { status: 'requested', clientMessage: '' });
        return project;
    },
    updateRequestForOwner: async (id, ownerId, requestId, fields) => {
        const project = ownedProject(id, ownerId);
        const request = project && project.requests.find((item) => String(item._id) === String(requestId));
        if (!request || !['requested', 'needs_info'].includes(request.status)) return null;
        Object.assign(request, fields, { status: 'requested', clientMessage: '' });
        return project;
    },
    addRequestForOwner: async (id, ownerId, request) => {
        const project = ownedProject(id, ownerId);
        if (!project) return null;
        project.requests.push({ _id: ids.request, status: 'requested', ...request });
        return project;
    },
    listForAdmin: async (filter) => store.projects.filter((project) => !filter.ownerId || String(project.ownerId) === String(filter.ownerId)),
    getForAdmin: async (id) => store.projects.find((project) => String(project._id) === String(id)) || null,
    updateForAdmin: async (id, fields) => {
        const project = store.projects.find((item) => String(item._id) === String(id));
        if (!project) return null;
        calls.adminUpdates.push(fields);
        Object.assign(project, fields);
        return project;
    },
    updateRequestForAdmin: async (id, requestId, fields) => {
        const project = store.projects.find((item) => String(item._id) === String(id));
        const request = project && project.requests.find((item) => String(item._id) === String(requestId));
        if (!request) return null;
        calls.requestUpdates.push(fields);
        Object.assign(request, fields);
        return project;
    },
    createFromBriefForAdmin: async (owner, briefId, fields) => {
        const project = { _id: new mongoose.Types.ObjectId(), ownerId: owner._id, briefId, status: 'requested', requests: [], ...fields };
        store.projects.push(project);
        calls.converted.push(project);
        return project;
    }
});
mockModule('../models/clientBrief', {
    listForAdmin: async () => Object.values(store.briefs),
    getForAdmin: async (id) => store.briefs[String(id)] || null,
    markConverted: async (id, projectId) => {
        const brief = store.briefs[String(id)];
        brief.status = 'converted';
        brief.projectId = projectId;
        return brief;
    }
});

const JwtManager = require('../jwt/jwtManager');
const auth = require('../controllers/auth');
const requireClient = require('../middleware/requireClient');
const clientProjects = require('../controllers/clientProjects');
const adminClientProjects = require('../controllers/adminClientProjects');
const clientBriefs = require('../controllers/clientBriefs');
const { validateProjectInput, validateRequestInput, isReadableText } = require('../lib/clientProjectInput');

function response() {
    return {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; }
    };
}
const bearer = (email) => ({ authorization: `Bearer ${new JwtManager().generate({ email })}` });

async function asClient(email) {
    const req = { headers: bearer(email) };
    const res = response();
    let passed = false;
    await auth.authorize(req, res, () => { passed = true; });
    if (!passed) return { req, res, passed };
    passed = false;
    await requireClient(req, res, () => { passed = true; });
    return { req, res, passed };
}

const validProject = {
    name: '  Booking portal  ',
    type: 'Web application',
    businessDescription: 'We run a dental clinic with three dentists and a front desk in Khartoum.',
    goal: 'Let patients book and manage appointments online without calling.',
    summary: 'Patients should be able to see available times, book an appointment, receive a confirmation, and reschedule if needed. The front desk sees the daily schedule.',
    problem: 'Today the front desk takes all bookings by phone, which causes double bookings and missed calls.',
    outcome: 'Fewer phone calls, no double bookings, and patients confirm their own appointments.',
    userRoles: [
        { name: 'Patient', goals: 'Find a free slot, book it, and get a reminder before the visit.' },
        { name: 'Front desk', goals: 'See the daily schedule and move or cancel appointments.' }
    ],
    features: [
        { title: 'Online booking', description: 'Patient picks a dentist, sees free slots for the next two weeks, and books one.', priority: 'must' },
        { title: 'SMS reminder', description: 'The system sends a reminder one day before the appointment with a cancel link.' }
    ],
    devices: ['Mobile web', 'Desktop web', 'Mobile web'],
    languages: ['Arabic', 'English'],
    contentReadiness: 'Some content is ready; the rest needs work',
    integrations: ['Email or messaging', 'Payments or billing', 'Email or messaging'],
    targetDate: '2026-12-15',
    timelineFlexibility: 'Some flexibility',
    budgetRange: '$5,000–$10,000',
    decisionMaker: 'Dr. Amal, clinic owner',
    contactMethod: 'WhatsApp',
    contactPhone: '+249 900 000 000'
};
const gibberish = 'dskljfgdl lkdfkfvmc lkjdirjf llkjdfd lkmnvnnfiu lls;so0juf kkkd j ;ljfkjfdiin l;s;djj knvvv llkdhy kdkdhg llskdhg assdf kkfhht kkjhf kkdjhg';

const validRequest = {
    title: 'SMS reminders',
    userRole: 'Patient',
    details: 'One day before the appointment, text the patient the time, the dentist name, and a link to cancel.',
    reason: 'Patients forget appointments and we lose the slot.',
    acceptance: 'A test patient receives the SMS 24 hours before and the cancel link works.',
    priority: 'high',
    targetDate: '2027-01-10'
};

test('readable-text check rejects keyboard mashing but accepts real English and Arabic', () => {
    assert.equal(isReadableText(gibberish), false);
    assert.equal(isReadableText('Patients should be able to see available times and book an appointment.'), true);
    assert.equal(isReadableText('نظام حجز مواعيد للعيادة مع تذكير عبر الرسائل'), true);
    assert.equal(isReadableText('ok'), true);
});

test('project input validation trims, dedupes, enforces structure and rejects unknown options', () => {
    const ok = validateProjectInput(validProject);
    assert.equal(ok.error, undefined);
    assert.equal(ok.fields.name, 'Booking portal');
    assert.deepEqual(ok.fields.integrations, ['Email or messaging', 'Payments or billing']);
    assert.deepEqual(ok.fields.devices, ['Mobile web', 'Desktop web']);
    assert.equal(ok.fields.targetDate.toISOString(), '2026-12-15T00:00:00.000Z');
    assert.equal(ok.fields.userRoles.length, 2);
    assert.equal(ok.fields.features[1].priority, 'must');
    assert.equal(ok.fields.successMetrics, '');

    assert.match(validateProjectInput({ name: 'x' }).error, /Project type is required/);
    assert.match(validateProjectInput({ ...validProject, summary: gibberish }).error, /does not look like readable text/);
    assert.match(validateProjectInput({ ...validProject, summary: 'Too short.' }).error, /at least 15 words/);
    assert.match(validateProjectInput({ ...validProject, userRoles: [] }).error, /at least one type of user/);
    assert.match(validateProjectInput({ ...validProject, features: [{ title: 'Booking', description: 'short' }] }).error, /at least 8 words/);
    assert.match(validateProjectInput({ ...validProject, devices: [] }).error, /devices/);
    assert.match(validateProjectInput({ ...validProject, contentReadiness: '' }).error, /Content readiness is required/);
    assert.match(validateProjectInput({ ...validProject, type: 'Spaceship' }).error, /Project type/);
    assert.match(validateProjectInput({ ...validProject, integrations: ['Blockchain'] }).error, /integrations/i);
    assert.match(validateProjectInput({ ...validProject, targetDate: '15/12/2026' }).error, /Target date/);

    assert.equal(validateRequestInput(validRequest).error, undefined);
    assert.equal(validateRequestInput({ ...validRequest, priority: undefined }).fields.priority, 'normal');
    assert.match(validateRequestInput({ title: 'Dark mode' }).error, /Who uses this feature is required/);
    assert.match(validateRequestInput({ ...validRequest, acceptance: '' }).error, /How we know it is done is required/);
    assert.match(validateRequestInput({ ...validRequest, details: gibberish }).error, /readable text/);
    assert.match(validateRequestInput({ ...validRequest, priority: 'urgent' }).error, /Priority/);
});

test('visitors are refused with CLIENT_ROLE_REQUIRED and anonymous callers get 401', async () => {
    const visitor = await asClient(accounts.visitor.email);
    assert.equal(visitor.passed, false);
    assert.equal(visitor.res.statusCode, 403);
    assert.equal(visitor.res.body.code, 'CLIENT_ROLE_REQUIRED');

    const anonymous = response();
    let passed = false;
    await auth.authorize({ headers: {} }, anonymous, () => { passed = true; });
    assert.equal(passed, false);
    assert.equal(anonymous.statusCode, 401);
});

test('a client can create a project, list it, and read it back without admin notes leaking', async () => {
    const { req, passed } = await asClient(accounts.client.email);
    assert.equal(passed, true);
    assert.equal(String(req.client._id), String(ids.client));

    const bad = response();
    await clientProjects.create({ ...req, body: { name: 'No summary' } }, bad, assert.ifError);
    assert.equal(bad.statusCode, 400);

    const created = response();
    await clientProjects.create({ ...req, body: validProject }, created, assert.ifError);
    assert.equal(created.statusCode, 201);
    assert.equal(created.body.data.name, 'Booking portal');
    assert.equal(String(created.body.data.ownerId), String(ids.client));

    const list = response();
    await clientProjects.listMine(req, list, assert.ifError);
    assert.equal(list.body.data.length, 1);

    const detail = response();
    await clientProjects.getMine({ ...req, params: { id: String(ids.project) } }, detail, assert.ifError);
    assert.equal(detail.statusCode, 200);
    assert.equal(detail.body.data.status, 'requested');

    const invalid = response();
    await clientProjects.getMine({ ...req, params: { id: 'not-an-id' } }, invalid, assert.ifError);
    assert.equal(invalid.statusCode, 404);
});

test('a client can add a feature request only to their own project', async () => {
    const owner = await asClient(accounts.client.email);
    const other = await asClient(accounts.otherClient.email);
    const request = validRequest;

    const foreign = response();
    await clientProjects.addRequest({ ...other.req, params: { id: String(ids.project) }, body: request }, foreign, assert.ifError);
    assert.equal(foreign.statusCode, 404);

    const bad = response();
    await clientProjects.addRequest({ ...owner.req, params: { id: String(ids.project) }, body: { title: 'x' } }, bad, assert.ifError);
    assert.equal(bad.statusCode, 400);

    const ok = response();
    await clientProjects.addRequest({ ...owner.req, params: { id: String(ids.project) }, body: request }, ok, assert.ifError);
    assert.equal(ok.statusCode, 201);
    assert.equal(ok.body.data.requests.length, 1);
    assert.equal(ok.body.data.requests[0].title, 'SMS reminders');
    assert.equal(ok.body.data.requests[0].priority, 'high');

    const otherList = response();
    await clientProjects.listMine(other.req, otherList, assert.ifError);
    assert.equal(otherList.body.data.length, 0);
});

test('admin asks for more information and the client revises; locked items cannot be edited', async () => {
    const owner = await asClient(accounts.client.email);
    const project = store.projects.find((item) => String(item._id) === String(ids.project));

    const missingMessage = response();
    await adminClientProjects.update({ params: { id: String(ids.project) }, body: { status: 'needs_info' } }, missingMessage, assert.ifError);
    assert.equal(missingMessage.statusCode, 400);
    assert.match(missingMessage.body.message, /what information is missing/);

    const asked = response();
    await adminClientProjects.update({ params: { id: String(ids.project) }, body: { status: 'needs_info', clientMessage: 'Which dentists and how many rooms?' } }, asked, assert.ifError);
    assert.equal(asked.statusCode, 200);
    assert.equal(project.status, 'needs_info');
    assert.equal(project.clientMessage, 'Which dentists and how many rooms?');

    const badEdit = response();
    await clientProjects.updateMine({ ...owner.req, params: { id: String(ids.project) }, body: { ...validProject, summary: gibberish } }, badEdit, assert.ifError);
    assert.equal(badEdit.statusCode, 400);

    const revised = response();
    await clientProjects.updateMine({ ...owner.req, params: { id: String(ids.project) }, body: { ...validProject, name: 'Booking portal v2' } }, revised, assert.ifError);
    assert.equal(revised.statusCode, 200);
    assert.equal(revised.body.data.name, 'Booking portal v2');
    assert.equal(revised.body.data.status, 'requested');
    assert.equal(revised.body.data.clientMessage, '');

    project.status = 'active';
    const locked = response();
    await clientProjects.updateMine({ ...owner.req, params: { id: String(ids.project) }, body: validProject }, locked, assert.ifError);
    assert.equal(locked.statusCode, 409);
    assert.equal(locked.body.code, 'PROJECT_LOCKED');

    const requestAsked = response();
    await adminClientProjects.updateRequest({ params: { id: String(ids.project), requestId: String(ids.request) }, body: { status: 'needs_info', clientMessage: 'Which phone number should we text?' } }, requestAsked, assert.ifError);
    assert.equal(requestAsked.statusCode, 200);
    assert.equal(project.requests[0].status, 'needs_info');

    const requestRevised = response();
    await clientProjects.updateMyRequest({ ...owner.req, params: { id: String(ids.project), requestId: String(ids.request) }, body: { ...validRequest, details: `${validRequest.details} Use the number on the patient profile.` } }, requestRevised, assert.ifError);
    assert.equal(requestRevised.statusCode, 200);
    assert.equal(project.requests[0].status, 'requested');
    assert.equal(project.requests[0].clientMessage, '');
    assert.match(project.requests[0].details, /patient profile/);
    calls.adminUpdates.length = 0;
    calls.requestUpdates.length = 0;
});

test('admin can review projects, change statuses, and update feature requests', async () => {
    const list = response();
    await adminClientProjects.list({ query: { ownerId: String(ids.client) } }, list, assert.ifError);
    assert.equal(list.body.data.length, 1);

    const badFilter = response();
    await adminClientProjects.list({ query: { status: 'bogus' } }, badFilter, assert.ifError);
    assert.equal(badFilter.statusCode, 400);

    const detail = response();
    await adminClientProjects.get({ params: { id: String(ids.project) } }, detail, assert.ifError);
    assert.equal(detail.body.data.owner.email, accounts.client.email);

    const badStatus = response();
    await adminClientProjects.update({ params: { id: String(ids.project) }, body: { status: 'done' } }, badStatus, assert.ifError);
    assert.equal(badStatus.statusCode, 400);

    const empty = response();
    await adminClientProjects.update({ params: { id: String(ids.project) }, body: {} }, empty, assert.ifError);
    assert.equal(empty.statusCode, 400);

    const updated = response();
    await adminClientProjects.update({ params: { id: String(ids.project) }, body: { status: 'active', adminNotes: ' Kickoff booked. ' } }, updated, assert.ifError);
    assert.equal(updated.statusCode, 200);
    assert.deepEqual(calls.adminUpdates, [{ status: 'active', adminNotes: 'Kickoff booked.' }]);

    const requestUpdated = response();
    await adminClientProjects.updateRequest({ params: { id: String(ids.project), requestId: String(ids.request) }, body: { status: 'approved' } }, requestUpdated, assert.ifError);
    assert.equal(requestUpdated.statusCode, 200);
    assert.deepEqual(calls.requestUpdates, [{ status: 'approved' }]);
    assert.equal(requestUpdated.body.data.requests[0].status, 'approved');

    const missingRequest = response();
    await adminClientProjects.updateRequest({ params: { id: String(ids.project), requestId: String(new mongoose.Types.ObjectId()) }, body: { status: 'approved' } }, missingRequest, assert.ifError);
    assert.equal(missingRequest.statusCode, 404);
});

test('admin converts a legacy public brief into a project profile owned by the matching client', async () => {
    store.briefs[String(ids.brief)] = {
        _id: ids.brief, clientName: 'Cleo Client', clientEmail: accounts.client.email, company: 'Cleo Co', projectName: 'Legacy site', status: 'new',
        createdAt: new Date('2026-03-01'),
        responses: {
            'Your name': 'Cleo Client', 'Email address': accounts.client.email, 'Project name': 'Legacy site', 'Project type': 'Website',
            'Project idea': 'Rebuild the marketing site.', 'Integrations': ['Email or messaging', 'Not a real option'],
            'Estimated budget': '$2,500–$5,000', 'Ideal launch or completion date': '2026-09-01', 'Phone number': '555-0100'
        }
    };
    store.briefs[String(ids.convertedBrief)] = { _id: ids.convertedBrief, clientEmail: 'x@example.invalid', projectName: 'Done', status: 'converted', projectId: ids.project, responses: {} };

    const already = response();
    await clientBriefs.convert({ params: { id: String(ids.convertedBrief) }, body: {} }, already, assert.ifError);
    assert.equal(already.statusCode, 409);

    const noAccount = response();
    store.briefs[String(ids.brief)].clientEmail = 'nobody@example.invalid';
    await clientBriefs.convert({ params: { id: String(ids.brief) }, body: {} }, noAccount, assert.ifError);
    assert.equal(noAccount.statusCode, 422);
    assert.equal(noAccount.body.code, 'CLIENT_ACCOUNT_REQUIRED');

    const visitorOwner = response();
    await clientBriefs.convert({ params: { id: String(ids.brief) }, body: { ownerId: String(ids.visitor) } }, visitorOwner, assert.ifError);
    assert.equal(visitorOwner.statusCode, 422);

    const converted = response();
    await clientBriefs.convert({ params: { id: String(ids.brief) }, body: { ownerId: String(ids.client) } }, converted, assert.ifError);
    assert.equal(converted.statusCode, 201);
    const project = converted.body.data.project;
    assert.equal(String(project.ownerId), String(ids.client));
    assert.equal(String(project.briefId), String(ids.brief));
    assert.equal(project.name, 'Legacy site');
    assert.equal(project.type, 'Website');
    assert.equal(project.summary, 'Rebuild the marketing site.');
    assert.deepEqual(project.integrations, ['Email or messaging']);
    assert.equal(project.budgetRange, '$2,500–$5,000');
    assert.equal(project.targetDate.toISOString(), '2026-09-01T00:00:00.000Z');
    assert.match(project.otherDetails, /Phone: 555-0100/);
    assert.equal(project.status, 'needs_info');
    assert.match(project.clientMessage, /complete the structured project form/);
    assert.equal(converted.body.data.brief.status, 'converted');
    assert.equal(String(converted.body.data.brief.projectId), String(project._id));
});
