// Shared vocabularies for client project profiles and feature requests.
// The intake is choice-first: clients pick from these lists; free text is limited to short, capped fields.

const PROJECT_TYPES = [
    'Website',
    'Web application',
    'Mobile application',
    'Business software or portal',
    'Automation or integration',
    'Consulting or technical support',
    'Other / not sure yet'
];

const INDUSTRIES = [
    'Retail or e-commerce',
    'Restaurant, café or food',
    'Healthcare or clinic',
    'Real estate or property',
    'Education or training',
    'Transportation or logistics',
    'Construction or engineering',
    'Automotive',
    'Professional services (law, accounting, consulting)',
    'Beauty, salon or wellness',
    'Non-profit or community',
    'Government or public sector',
    'Other'
];

const BUSINESS_SIZES = ['Just me', '2–10 people', '11–50 people', '51–200 people', 'More than 200 people'];

const PRIMARY_GOALS = [
    'Get more customers or enquiries',
    'Sell products online',
    'Take bookings or appointments online',
    'Reduce manual work for my team',
    'Replace an existing system or website',
    'Manage customers, orders or records in one place',
    'Build brand presence and credibility',
    'Communicate with members or the community',
    'Other'
];

const PAIN_POINTS = [
    'Everything is handled by phone or WhatsApp',
    'Orders or bookings get lost or doubled',
    'No online presence at all',
    'Current website is outdated or hard to update',
    'Data lives in spreadsheets or paper',
    'Customers wait too long for answers',
    'Cannot track payments, stock or deliveries',
    'Staff use too many separate tools'
];

const SUCCESS_MEASURES = [
    'More enquiries or leads',
    'More sales or bookings',
    'Fewer phone calls and messages',
    'Less admin time per order or booking',
    'Fewer errors (double bookings, wrong orders)',
    'Faster response to customers',
    'Better reports and visibility',
    'Happier customers or members'
];

const USER_ROLE_TYPES = [
    'Customer or visitor (no account)',
    'Registered customer or member',
    'Staff or employee',
    'Manager or owner',
    'Administrator',
    'Supplier, partner or driver',
    'Other'
];

const USER_COUNTS = ['1–10', '11–100', '101–1,000', 'More than 1,000', 'Not sure'];

const USER_CAPABILITIES = [
    'Browse information or a catalogue',
    'Search and filter',
    'Create an account and sign in',
    'Place an order',
    'Book an appointment or reservation',
    'Pay online',
    'Send a message or enquiry',
    'Upload documents or photos',
    'Receive notifications (email, SMS, WhatsApp)',
    'Add or edit content and listings',
    'Approve or process orders and bookings',
    'View reports and statistics',
    'Manage other users and permissions',
    'Export data'
];

// What each role type can plausibly do; stops "customers" being given admin powers.
const PUBLIC_CAPABILITIES = ['Browse information or a catalogue', 'Search and filter', 'Place an order', 'Book an appointment or reservation', 'Pay online', 'Send a message or enquiry', 'Receive notifications (email, SMS, WhatsApp)'];
const MEMBER_CAPABILITIES = [...PUBLIC_CAPABILITIES, 'Create an account and sign in', 'Upload documents or photos'];
const STAFF_CAPABILITIES = ['Create an account and sign in', 'Search and filter', 'Send a message or enquiry', 'Upload documents or photos', 'Receive notifications (email, SMS, WhatsApp)', 'Add or edit content and listings', 'Approve or process orders and bookings', 'View reports and statistics', 'Export data'];
const CAPABILITIES_BY_ROLE = {
    'Customer or visitor (no account)': PUBLIC_CAPABILITIES,
    'Registered customer or member': MEMBER_CAPABILITIES,
    'Staff or employee': STAFF_CAPABILITIES,
    'Manager or owner': [...STAFF_CAPABILITIES, 'Manage other users and permissions'],
    'Administrator': [...STAFF_CAPABILITIES, 'Manage other users and permissions'],
    'Supplier, partner or driver': ['Create an account and sign in', 'Search and filter', 'Send a message or enquiry', 'Upload documents or photos', 'Receive notifications (email, SMS, WhatsApp)', 'Approve or process orders and bookings', 'Add or edit content and listings'],
    'Other': USER_CAPABILITIES
};

// Feature catalogue. `types` limits which project types show a feature (empty = all).
// `detailQuestion`/`detailOptions` add one closed follow-up so developers get specifics without free text.
const FEATURE_CATALOGUE = [
    { key: 'pages_basic', label: 'Basic pages (home, about, services, contact)', types: ['Website'], detailQuestion: 'Which pages?', detailOptions: ['Home', 'About us', 'Services', 'Products', 'Contact', 'FAQ', 'Team', 'Pricing', 'Gallery'] },
    { key: 'catalogue', label: 'Product or service catalogue', types: ['Website', 'Web application', 'Mobile application'], detailQuestion: 'How many items at launch?', detailOptions: ['Under 20', '20–100', '100–1,000', 'More than 1,000'] },
    { key: 'ordering', label: 'Online ordering or shopping cart', types: ['Website', 'Web application', 'Mobile application'], detailQuestion: 'How are orders fulfilled?', detailOptions: ['Pickup', 'Local delivery', 'Shipping', 'Digital or service only'] },
    { key: 'booking', label: 'Online booking or appointments', types: [], detailQuestion: 'What is booked?', detailOptions: ['Appointments with staff', 'Tables or seats', 'Rooms or venues', 'Vehicles or equipment', 'Classes or events'] },
    { key: 'payments', label: 'Online payments', types: [], detailQuestion: 'Which payment methods?', detailOptions: ['PayPal', 'Card payments (Stripe or bank gateway)', 'Bank transfer', 'Cash on delivery or at location', 'Mobile money or local wallet'] },
    { key: 'accounts', label: 'Customer accounts and sign-in', types: [], detailQuestion: 'How do users sign in?', detailOptions: ['Email and password', 'Phone number and code', 'Google or Apple', 'Not sure'] },
    { key: 'contact', label: 'Contact or enquiry form', types: [], detailQuestion: 'Where should enquiries arrive?', detailOptions: ['Email', 'WhatsApp', 'Dashboard inside the system', 'All of these'] },
    { key: 'whatsapp', label: 'WhatsApp or live chat button', types: ['Website', 'Web application', 'Mobile application'] },
    { key: 'notifications', label: 'Notifications and reminders', types: [], detailQuestion: 'Through which channel?', detailOptions: ['Email', 'SMS', 'WhatsApp', 'In-app push'] },
    { key: 'gallery', label: 'Photo or video gallery', types: ['Website', 'Mobile application'] },
    { key: 'blog', label: 'News, blog or announcements', types: ['Website', 'Web application'] },
    { key: 'multilang', label: 'Multiple languages (e.g. Arabic and English)', types: [] },
    { key: 'maps', label: 'Map, locations or delivery tracking', types: [] },
    { key: 'reviews', label: 'Reviews or testimonials', types: ['Website', 'Web application', 'Mobile application'] },
    { key: 'cms', label: 'Admin dashboard to edit content and listings', types: [] },
    { key: 'orders_admin', label: 'Order or booking management for staff', types: [], detailQuestion: 'What must staff do with them?', detailOptions: ['View and confirm', 'Assign to staff or drivers', 'Change status and notify customer', 'Issue refunds or cancellations'] },
    { key: 'inventory', label: 'Stock or inventory tracking', types: ['Web application', 'Business software or portal', 'Mobile application', 'Automation or integration'] },
    { key: 'invoicing', label: 'Invoices, receipts or quotes', types: [] },
    { key: 'reports', label: 'Reports and statistics', types: [], detailQuestion: 'Which reports matter most?', detailOptions: ['Sales or bookings over time', 'Customers and repeat rate', 'Stock levels', 'Staff performance', 'Financial summary'] },
    { key: 'roles', label: 'User roles and permissions', types: ['Web application', 'Business software or portal', 'Mobile application'] },
    { key: 'documents', label: 'Document or file uploads', types: [] },
    { key: 'import_export', label: 'Import or export data (Excel, CSV)', types: [] },
    { key: 'integration_existing', label: 'Connect to an existing system', types: [], detailQuestion: 'Which kind of system?', detailOptions: ['Accounting software', 'Point of sale', 'CRM or ERP', 'Google Sheets or Excel', 'Social media', 'Other'] },
    { key: 'offline', label: 'Works offline (mobile)', types: ['Mobile application'] },
    { key: 'other', label: 'Something else (name it)', types: [] }
];

const FEATURE_PRIORITIES = ['must', 'should', 'could'];

const DEVICES = ['Desktop web', 'Mobile web', 'Android app', 'iOS app'];
const LANGUAGES = ['English', 'Arabic', 'French', 'Turkish', 'Urdu', 'Hindi', 'Swahili', 'Amharic', 'Tigrinya', 'Somali', 'Spanish', 'German', 'Chinese'];

const COUNTRIES = [
    'Sudan', 'South Sudan', 'Egypt', 'Saudi Arabia', 'United Arab Emirates', 'Qatar', 'Kuwait', 'Bahrain', 'Oman', 'Jordan',
    'Ethiopia', 'Eritrea', 'Kenya', 'Uganda', 'Chad', 'Libya', 'Turkey', 'United States', 'United Kingdom', 'Canada', 'Germany', 'Other'
];

// Devices that make sense for each project type (empty = any). Keeps a 'Website' from asking for native apps.
const DEVICES_BY_TYPE = {
    'Website': ['Desktop web', 'Mobile web'],
    'Web application': ['Desktop web', 'Mobile web'],
    'Mobile application': ['Android app', 'iOS app', 'Mobile web'],
    'Business software or portal': ['Desktop web', 'Mobile web', 'Android app', 'iOS app'],
    'Automation or integration': ['Desktop web', 'Mobile web', 'Android app', 'iOS app'],
    'Consulting or technical support': ['Desktop web', 'Mobile web', 'Android app', 'iOS app'],
    'Other / not sure yet': ['Desktop web', 'Mobile web', 'Android app', 'iOS app']
};

// Lists where clients must prioritise instead of ticking everything.
const MAX_CHOICES = { secondaryGoals: 2, painPoints: 3, successMeasures: 3, integrations: 4, capabilities: 6 };
const ACCESSIBILITY = ['Not required', 'Required (screen readers, high contrast, keyboard use)', 'Not sure'];
const EXISTING_WEBSITE = ['No website yet', 'Yes, keep it and extend it', 'Yes, replace it'];
const EXISTING_SYSTEMS = [
    'None',
    'Spreadsheets (Excel or Google Sheets)',
    'WhatsApp groups',
    'Facebook or Instagram page',
    'Accounting software',
    'Point of sale (POS)',
    'CRM or ERP',
    'Another website or app',
    'Other'
];
const ASSET_ITEMS = ['logo', 'text', 'photos', 'domain', 'hosting', 'brandColors'];
const ASSET_LABELS = { logo: 'Logo', text: 'Written content', photos: 'Photos or videos', domain: 'Domain name', hosting: 'Hosting account', brandColors: 'Brand colours or guidelines' };
const ASSET_STATUSES = ['have', 'need', 'not_sure'];

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
const DECISION_MAKER_ROLES = ['Me', 'A business partner', 'A manager or director', 'A board or committee', 'Other'];
const CONTACT_METHODS = ['Email', 'Phone call', 'WhatsApp'];

// SDLC phase 3 — Design
const DESIGN_STYLES = ['Clean and minimal', 'Bold and colourful', 'Corporate and formal', 'Warm and friendly', 'Premium or luxury', 'Not sure — guide me'];
const REFERENCE_LIKES = ['Colours', 'Layout and structure', 'Fonts and typography', 'Photos and imagery', 'Navigation and menus', 'Overall feel'];

// SDLC phase 4 — Development
const DATA_MIGRATION = ['No existing data to move', 'Yes, a small amount (under 1,000 records)', 'Yes, a large amount', 'Not sure'];
const HOSTING_PREFERENCE = ['Awaaab LLC hosts and manages it', 'My own hosting or cloud account', 'Not sure — recommend one'];
const CONTENT_PROVIDER = ['We provide all text and photos', 'We provide some; Awaaab LLC creates the rest', 'Awaaab LLC creates all content'];

// SDLC phase 5 — Testing and acceptance
const UAT_TESTERS = ['Me', 'My staff', 'A few real customers or members', 'Awaaab LLC only'];
const TEST_DATA = ['We can provide real sample data', 'Use made-up test data', 'Not sure'];
const ACCEPTANCE_METHOD = ['A live demo session together', 'A written checklist I sign off', 'A trial period using it for real', 'Not sure'];

// SDLC phase 6 — Deployment
const LAUNCH_APPROACH = ['Launch everything at once', 'Soft launch to a small group first', 'Phase by phase (most important features first)', 'Not sure'];
const TRAINING_NEEDS = ['No training needed', 'One training session for my team', 'Written guide or short videos', 'Both a session and a guide'];

// SDLC phase 7 — Maintenance
const CONTENT_MAINTAINER = ['My team updates content ourselves', 'Awaaab LLC updates content on request', 'A mix of both'];
const SUPPORT_LEVEL = ['No ongoing support after launch', 'Occasional fixes when needed', 'Monthly maintenance plan', 'Priority support with agreed response times'];
const UPDATE_FREQUENCY = ['Rarely (a few times a year)', 'Monthly', 'Weekly', 'Daily'];

// Feature requests on an existing project.
const REQUEST_KINDS = ['Add a new feature', 'Change how an existing feature works', 'Fix a problem', 'Improve design or speed'];
const REQUEST_OUTCOMES = [
    'Something new is shown on screen',
    'A notification is sent (email, SMS, WhatsApp)',
    'Data is saved or updated',
    'It appears in a report or export',
    'Only certain users can see or do it',
    'It works on mobile',
    'An existing step is removed or shortened',
    'Other'
];
const REQUEST_PRIORITIES = ['low', 'normal', 'high'];

// "needs_info" stays available for edge cases, but the closed form is designed to avoid it.
const PROJECT_STATUSES = ['requested', 'needs_info', 'reviewing', 'proposal_sent', 'active', 'on_hold', 'completed', 'declined'];
const REQUEST_STATUSES = ['requested', 'needs_info', 'reviewing', 'approved', 'in_progress', 'completed', 'declined'];
const CLIENT_EDITABLE_STATUSES = ['requested', 'needs_info'];

const LIMITS = {
    name: 80,
    shortText: 80,
    url: 300,
    maxReferenceUrls: 3,
    notes: 500,
    featureNotes: 200,
    requestSummary: 200,
    requestExample: 300,
    adminNotes: 5000,
    clientMessage: 2000,
    maxRoles: 8,
    maxFeatures: 20,
    phone: 40
};

const MIN_WORDS = {
    requestSummary: 6
};

module.exports = {
    PROJECT_TYPES,
    INDUSTRIES,
    BUSINESS_SIZES,
    PRIMARY_GOALS,
    PAIN_POINTS,
    SUCCESS_MEASURES,
    USER_ROLE_TYPES,
    USER_COUNTS,
    USER_CAPABILITIES,
    CAPABILITIES_BY_ROLE,
    COUNTRIES,
    DEVICES_BY_TYPE,
    MAX_CHOICES,
    FEATURE_CATALOGUE,
    FEATURE_PRIORITIES,
    DEVICES,
    LANGUAGES,
    ACCESSIBILITY,
    EXISTING_WEBSITE,
    EXISTING_SYSTEMS,
    ASSET_ITEMS,
    ASSET_LABELS,
    ASSET_STATUSES,
    INTEGRATIONS,
    BUDGET_RANGES,
    TIMELINE_FLEXIBILITY,
    DECISION_MAKER_ROLES,
    CONTACT_METHODS,
    DESIGN_STYLES,
    REFERENCE_LIKES,
    DATA_MIGRATION,
    HOSTING_PREFERENCE,
    CONTENT_PROVIDER,
    UAT_TESTERS,
    TEST_DATA,
    ACCEPTANCE_METHOD,
    LAUNCH_APPROACH,
    TRAINING_NEEDS,
    CONTENT_MAINTAINER,
    SUPPORT_LEVEL,
    UPDATE_FREQUENCY,
    REQUEST_KINDS,
    REQUEST_OUTCOMES,
    REQUEST_PRIORITIES,
    PROJECT_STATUSES,
    REQUEST_STATUSES,
    CLIENT_EDITABLE_STATUSES,
    LIMITS,
    MIN_WORDS
};
