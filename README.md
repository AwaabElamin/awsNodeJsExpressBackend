# awsNodeJsExpressBackend (refactor)

Quick notes to run and develop locally after the refactor:

1. Copy `.env.example` to `.env` and set real connection strings and secrets.

2. Install dependencies:

```bash
npm install
```

3. Run in development mode (auto-reload):

```bash
npm run dev
```

4. Run production/start:

```bash
npm start
```

The container exposes port `3000` and provides `GET /health` for ECS health checks.

## AutoHub vehicle location

Creating or editing a vehicle requires `country` and `state` (state, region, or
emirate), each a non-blank string up to 100 characters. Both are returned in public
and owner listings. Existing listings without a location must supply one on edit.
Sample locations are demonstration data, not verified vehicle locations.
Listing titles/descriptions no longer display the word "Sample". The sample
seeders retain their filenames but recognize the existing unlabeled listings
without duplicating them. Removing the label does not verify availability.

## Stored marketplace chat

AutoHub and Groceries use two-way in-app chat, not Gmail or SMTP replies.
Messages are persisted by the backend in the configured Awaaab MongoDB cluster:
AutoHub uses its existing `CarShop` message collection and Groceries its
`Groceries` message collection. They are not stored only in the browser.

Registered accounts (Visitors and Clients) can return to **My account** at
`/user` to list, read, and reply to their own AutoHub and Groceries conversations.
Sellers reply in the corresponding workspace inbox. Both interfaces poll for
updates and show unread counts. New messages accept 1-2000 trimmed characters;
write routes are rate-limited and updates are scoped to the authenticated
participant. There are no automatic emails or Gmail compose actions.

For each platform prefix (`/auto`, `/groceries`):
- `POST /conversations` starts a chat with the listing's verified seller.
- `GET /conversations` lists the signed-in account's visitor-side conversations.
- `GET /conversations/:id` reads and clears the visitor unread count.
- `POST /conversations/:id/messages` appends a visitor message.
- `GET /messages/inbox` and `GET /messages/inbox/:id` serve the seller inbox.
- `POST /messages/inbox/:id/reply` appends a seller message.

AutoHub access no longer depends on a browser-session guest token: new chats are
linked to the visitor account ID; older chats without that ID can be recovered
using the authenticated account's immutable email. Other accounts cannot read,
mark as read, or append messages. Historical email-only entries remain excluded
from visitor threads. Existing chat records are preserved.

Run the targeted Node tests normally. To additionally verify real MongoDB
persistence, set `CHAT_DB_TEST=1` and run
`node --test tests/storedChatPersistence.test.js`. This opt-in test creates only
temporary conversations with random participant IDs and deletes those exact
records in `finally`; it never changes users, listings, or existing chats.
Account verification and password-reset emails still use SMTP.

## Visitors and Client workspaces

Public registration creates the `Visitors` role. Verified Visitors can sign in
and send vehicle inquiries without becoming Clients. Inquiry sender name/email
come from the authenticated account, not request input. Chat history is accessible
after signing in again, without a saved browser token.

Visitors and Clients can edit their own first name, last name, phone, and profile
photo from **Edit profile**. Email is read-only in the form; the profile API
explicitly rejects requests containing an email change and allowlists editable
fields, so profile updates cannot change role or another account.

`POST /users/workspace` upgrades the authenticated verified Visitor to Client
when they explicitly choose **Create workspace**. Platform enrollment rejects
Visitors until then. Existing Clients/Admins and legacy accounts are preserved;
admin-created Clients remain Clients. The portal heading uses the account name
followed by `WorkShop`. No existing account roles are migrated automatically.

## Isolated profile testing

These commands run the profile editor against a local-only MongoDB volume. The local backend launcher refuses MongoDB URIs that are not `127.0.0.1:27018/awaab_local_users`; it does not load the production `.env`, SMTP is disabled, and photo uploads are disabled so no AWS bucket is touched.

1. Start the dedicated MongoDB container from this directory:

```bash
docker compose -f docker-compose.local.yml up -d
```

2. Seed the local test client and start the backend in separate terminals:

```bash
npm run seed:local-profile
npm run start:local
```

The local API listens on `http://127.0.0.1:3001`. The ignored `.env.local` is created for this workspace from `.env.local.example`; its test account is `profile-test@example.invalid` with password `LocalTest26!`.

3. In `ReactFrontAwaaabLLC`, `.env.development.local` points to the local API. From that directory, start Vite with:

```bash
node ./node_modules/vite/bin/vite.js . --config ./vite.config.ts --host 127.0.0.1 --port 5173
```

Open `http://127.0.0.1:5173/user` and sign in with the local test account to edit the profile. Do not change the local frontend API URL to production for this test.

The local Mongo data is stored in the Docker volume `awsnodejsexpressbackend_awaab_profile_local_mongo`. Stop the backend with Ctrl+C; stop Mongo with `docker compose -f docker-compose.local.yml down` (this preserves the volume). Profile-photo upload intentionally returns HTTP 501 in local mode.

What changed
- Centralized MongoDB connection in `lib/db.js` and established the connection during server startup in `bin/www`.
- Removed per-method `mongoose.connect()` calls in `models/users.js` and adjusted controllers to assume an active DB connection.
- Moved JWT secret and expiry to environment variables (`JWT_SECRET`, `JWT_EXPIRES_IN`). See `.env.example`.
- Registration now creates a pending user, sends an expiring email confirmation link, and blocks new-user login until verification.
- Configure SMTP and `FRONTEND_URL` in `.env` for email confirmation delivery.
- `app.js` now exports the express app; `bin/www` starts the server.

## Groceries

- Public products are available at `GET /groceries/products/viewAll`. Product
  creation/editing requires Country and State/Region (1-100 characters each),
  and the marketplace displays and searches both fields.
- Verified registered accounts, including `Visitors`, may submit an inquiry with
  `POST /groceries/conversations` (`productId`, `message`, maximum 2000 characters).
  Sender name/email and seller ownership are resolved server-side. Anonymous
  submissions are rejected; the existing conversation-start rate limiter applies.
- Grocery-enabled Clients/Admins read their own inquiries at
  `GET /groceries/messages/inbox` and `GET /groceries/messages/inbox/:id`.
  Replies use the shared **Send message** form and are stored in the conversation.
  Visitors reopen and reply from My account; see Stored marketplace chat above.
- `Visitors` must explicitly create their Client workspace in My portal before
  enabling a grocery shop. The shop heading uses their name plus `WorkShop`.
- Grocery data uses `MONGODB_DB_GROCERIES` (default `Groceries`) on the shared
  configured MongoDB connection. The loopback-only seller lookup on port 3002
  also supports `/groceries/seller-details` for older local clients. Grocery
  public listings now include `sellerName` and `sellerEmail` from the actual
  verified grocery seller profile, with owner-ID matching and legacy email
  fallback. Owner IDs and raw stored listing emails remain excluded. The grocery
  frontend no longer depends on the loopback lookup, including production builds.
- `node scripts/seedSampleGroceries.js --email=<existing verified Client email>`
  previews twelve sample products. Add `--apply` to transactionally insert missing
  samples and enable that seller's grocery membership. It is rerunnable and
  never reassigns or overwrites other products. Hashim now has twelve products:
  the initial chips and beef, plus apples, bananas, oranges, tomatoes, carrots,
  milk, eggs, bread, rice, and coffee. Each has a Saudi Arabia or UAE location.
  Visible titles do not include a Sample label.
- Local testing uses the frontend on port 5173 and updated backend on port 3001
  against the real database. Application changes have not been publicly deployed.
  Registration confirmation still requires configured SMTP.

## Client projects and legacy project briefs

- Client project requests come from the signed-in Client workspace (`/client-projects`); the anonymous `POST /client-briefs` endpoint and the public `project-brief.html` form were retired.
- `GET /client-projects/options` is public and returns the option vocabularies (project types, budget ranges, timeline flexibility, integrations, statuses, priorities).
- `/client-projects` otherwise requires a valid account token **and** the `Client` role (`middleware/requireClient.js`); Visitors receive `403 CLIENT_ROLE_REQUIRED` until they create a workspace.
  - `GET /client-projects` lists the caller's projects (summaries with request counts, including `needsInfoCount`).
  - `POST /client-projects` creates a project profile from the **guided, choice-first intake organised by SDLC phase**. Nearly every field is a closed choice from `lib/clientProjectOptions.js`; free text is limited to short capped fields (`name`, `country`, `city`, "Other" names ≤ 80 chars, per-feature `notes` ≤ 200, `notes` ≤ 500) which are checked with a readable-text heuristic (Latin gibberish → `400`; Arabic not judged).
    - *1 Planning*: `type`, `industry` (+`industryOther`), `businessSize`, `country` from `COUNTRIES` (+`countryOther`), `primaryGoal` (+`primaryGoalOther`), `secondaryGoals[]` (≤2, must differ from the primary goal), `painPoints[]` (top 3), `successMeasures[]` (top 3), `budgetRange`, `targetDate`, `timelineFlexibility`, `decisionMakerRole`, `decisionMakerName` (auto-filled from the account when the role is "Me"; otherwise ≥2 words), `contactMethod`, `contactPhone` (7–15 digits; required unless Email).
    - *2 Requirements*: `userRoles[{role, roleOther, count, capabilities[]}]` (≥1, no duplicate role types; capabilities must be in `CAPABILITIES_BY_ROLE[role]` and ≤6), `features[{key, customTitle, priority must|should|could, details[]}]` (≥1; `key` must exist in `FEATURE_CATALOGUE`, be allowed for the project `type`, and answer the catalogue's `detailQuestion` when it has one), `devices[]` (must be in `DEVICES_BY_TYPE[type]`), `languages[]` (≤3 from `LANGUAGES`), `accessibility`. Cross-field: every capability must be backed by a chosen feature (`CAPABILITY_REQUIRES_FEATURE`), every integration by a feature that uses it (`INTEGRATION_REQUIRES_FEATURE`), the primary goal by a delivering feature (`GOAL_REQUIRES_FEATURE`), customer-facing features need a customer role and back-office features a staff/manager/admin role, ≥4 features cannot all be "must", detail answers respect each question's `maxDetails` and `EXCLUSIVE_DETAILS` ("Not sure"/"All of these"), and the Must/Should scope points (`FEATURE_WEIGHTS`) must fit `BUDGET_SCOPE_LIMITS[budgetRange]` unless the range is "Need guidance"/"Prefer to discuss". An "Other" feature whose name matches a catalogue label is mapped to that feature. `targetDate`, when given, must be at least `MIN_LEAD_DAYS` (14) days ahead.
    - *3 Design*: `designStyle`, `references[{url, likes[]}]` (≤3, valid URLs), `assets{logo,text,photos,domain,hosting,brandColors}` each `have|need|not_sure`.
    - *4 Development*: `existingWebsite` (+`existingWebsiteUrl` when not "No website yet"), `existingSystems[]` ("None" is exclusive; +`existingSystemsOther`), `dataMigration` (cannot be "Yes" with no systems and no website), `hostingPreference`, `contentProvider`, `integrations[]` (≤4).
    - *5 Testing*: `uatTesters[]` ("Awaaab LLC only" is exclusive; "My staff" is rejected when `businessSize` is "Just me"), `testData`, `acceptanceMethod`. *6 Deployment*: `launchApproach`, `trainingNeeds`. *7 Maintenance*: `contentMaintainer`, `supportLevel`, `updateFrequency`, optional `notes`.
  - `GET /client-projects/:id` returns one owned project; `PATCH /client-projects/:id` lets the owner revise it **only while status is `requested` or `needs_info`** (same validation; resets status to `requested`, clears `clientMessage`, and removes legacy free-text answers; otherwise `409 PROJECT_LOCKED`).
  - `POST /client-projects/:id/requests` adds a feature request: `kind` (from `REQUEST_KINDS`), `relatedFeature` (one of the project's feature titles or "General…"), `userRole` (one of the project's roles or "All users"), `summary` (≤200 chars, ≥6 words, readable), `outcomes[]` (+`outcomesOther`), optional `example` (≤300), `priority`, `targetDate`, `budgetRange`. `PATCH /client-projects/:id/requests/:requestId` revises it under the same status rule (`409 REQUEST_LOCKED`).
  - Client responses never include `adminNotes`; they do include `clientMessage` (Admin's questions). Legacy free-text fields from earlier projects are retained read-only.
- `/admin/client-projects` requires Admin: `GET /` (optional `?ownerId=`/`?status=`), `GET /:id` (includes the owner account summary), `PATCH /:id` and `PATCH /:id/requests/:requestId` accept `status`, `adminNotes` (internal) and `clientMessage` (shown to the client). Setting `status: 'needs_info'` requires a `clientMessage`. `POST /:id/plan` regenerates the automatic plan (version +1). Project statuses: `requested`, `needs_info`, `reviewing`, `proposal_sent`, `active`, `on_hold`, `completed`, `declined`. Request statuses: `requested`, `needs_info`, `reviewing`, `approved`, `in_progress`, `completed`, `declined`.

### Automatic plan (`lib/projectPlanner.js`)

Every structured project gets a proposal the moment it is created or revised — no admin step. `buildPlan(project)`:
- resolves "Not sure"/over-ticked detail answers to defaults and records each as an **assumption** (e.g. sign-in → email + password; notifications → email + WhatsApp);
- adds the feature the primary goal needs when missing (e.g. a catalogue for "Sell products online") and infers a customer / staff **role** from the features;
- splits features into **phases** that fit `BUDGET_SCOPE_LIMITS[budgetRange]` (goal-delivering and must-have first), with indicative working days (`DAYS_PER_POINT`, `BASE_DAYS`) and a check against the target date;
- generates **micro tasks** per feature (design / build / test, from `FEATURE_TASKS`) and project-wide SDLC tasks (planning, design, development, testing, deployment, maintenance) derived from the client's answers;
- offers the client **one-click decisions**: `accept_phase1`, `full_scope` (raises the budget range and regenerates), `discuss`.

The plan is stored on the project (`plan`, `planDecision`). `POST /client-projects/:id/plan/decision { choice }` records the client's choice; accepting moves the project to `reviewing`. Legacy free-text projects return no plan (`422` on regenerate) until revised.

### Admin confirmation and requirements analysis (`lib/requirementsAnalysis.js`)

When the plan can go forward, Admin calls `POST /admin/client-projects/:id/plan/confirm`. The project moves to `proposal_sent`, `planConfirmed { at, by, planVersion }` is recorded, and `buildAnalysis(project, plan)` stores an SRS-style **requirements analysis** on the project (`analysis`): purpose & scope (in/out of Phase 1, constraints), stakeholders and user stories (from role capabilities), functional requirements per Phase 1 feature with acceptance criteria (`FEATURE_REQUIREMENTS` + the planner's test tasks), non-functional requirements (localisation/RTL, responsiveness, accessibility, performance, security, hosting, browsers, content ownership), data entities and integrations, design direction and asset status, delivery milestones derived from the plan timeline, risks with mitigations, the planner's assumptions, and open questions for the kickoff call. Regenerating the plan clears the confirmation; confirming again produces a new analysis. Clients see the analysis read-only once confirmed.
- `GET /admin/users/:id` now also returns `projects` (summaries) for the account.
- `GET /client-briefs` (Admin) lists legacy public briefs; `POST /client-briefs/:id/convert` (Admin, optional `ownerId`) creates a project profile from a brief, mapping the stored label-keyed answers onto project fields with lenient validation. Because legacy briefs lack the structured fields, the new project is created with `status: 'needs_info'` and a `clientMessage` asking the client to complete the form. The owner is the `ownerId` account or the Client whose email matches the brief; otherwise `422 CLIENT_ACCOUNT_REQUIRED`. The brief is marked `status: 'converted'` with `projectId`.
- `/admin/users` requires the same Admin authorization for account listing, Client creation, Client profile updates, and Client deletion. Responses never include password hashes or verification tokens.
- Account listing includes the Admin record for visibility; the API only permits CRUD on `Client` records. Client creation requires email verification; roles, emails, and passwords cannot be changed through profile editing.
- Admin account oversight (Clients and Visitors only; never the Admin record):
  - `GET /admin/users/:id` returns the account, its AutoHub cars and grocery products, and a summary of every AutoHub/Groceries conversation it takes part in (as seller or visitor).
  - `PATCH /admin/users/:id/status` with `{ isActive: boolean }` deactivates or reactivates the account. Deactivated accounts cannot sign in, existing tokens are rejected with `403` and `code: 'ACCOUNT_DEACTIVATED'`, and messaging is blocked. Listings stay publicly visible.
  - `POST /admin/users/:id/warnings` with `{ message }` (1–1000 chars) stores an in-app warning; `DELETE /admin/users/:id/warnings/:warningId` removes it. Warnings are returned by `POST /users/userInfo` so the account holder sees them on My account. No email is sent.
  - `GET` / `DELETE /admin/users/conversations/:platform/:conversationId` (`platform` is `auto` or `groceries`) read or permanently delete a conversation thread.
- Public signups always receive the `Visitors` role. They cannot choose or submit a role; becoming a Client requires explicit workspace creation.
- Configure the sole Admin with `ADMIN_PASSWORD` and `MONGODB_URI_USERS` in the environment, then run `npm run setup:admin`. The script hashes the password, provisions the username `Admin`, and demotes any other Admin accounts to `Client`.
- The Admin password is never stored in source code. Use a strong password and do not print it in logs.
- Configure `JWT_SECRET` as an App Runner runtime secret referencing AWS Secrets Manager, with an instance role limited to `secretsmanager:GetSecretValue` for that secret. Existing sessions must sign in again after the JWT signing key changes.

## Property management

- Property-management features are integrated into the Awaab LLC frontend at `/property-management`; the API is mounted at `/property-management/api`.
- Configure `MONGODB_DB_PROPERTY_MANAGEMENT` (defaults to `PropertyManagement`) to keep properties, users, leases, maintenance, accounting, and visitor inquiries in their own database.
- Public visitors can browse vacant listings and send inquiries from the listing or contact page. Awaab Admins can review visitor messages in the property dashboard.
- Property admin access uses the existing Awaab account and Admin role. Only Awaab Admins can list, create, update, or delete property-management users; property accounts cannot be assigned the admin role.
- Owners, tenants, managers, and contractors sign in using accounts created by an Awaab Admin. Uploaded property images are served below `/property-management/uploads`.
- Existing property records are not copied automatically. To migrate, set `SOURCE_MONGODB_URI` (including the source database name) and `MONGODB_URI_USERS`, then run `npm run migrate:property` for a dry run and `node scripts/migratePropertyManagement.js --apply` to copy (npm can swallow `--apply` in PowerShell). It never overwrites existing documents, skips the old property-admin users (replaced by the Awaab Admin), and is safe to re-run. Copy the source app's `uploads/` files into this backend's `uploads/` folder so property images keep working.
- The WhatsApp send endpoint (`POST /property-management/api/whatsapp/send`) is Awaab-Admin-only and only accepts Meta Graph `https://graph.facebook.com/vX/<id>/messages` URLs.

## AutoHub

- AutoHub is mounted under `/auto`; vehicle data uses the copied `CarShop.usedCars` collection, while identity and platform access use the shared Awaaab `users` collection (`platforms` records enabled workspaces).
- One `MONGODB_URI_USERS` connection can access the copied `users`, `Delivery`, `resume`, and `CarShop` databases; `MONGODB_DB_DELIVERY`, `MONGODB_DB_RESUME`, and `MONGODB_DB_CARSHOP` select each platform database. Set per-platform URI overrides only if a platform is later moved to another cluster.
- Resume has explicit collection schemas in `models/resume.js`. Delivery uses `models/delivery.js` to expose per-collection schemas without dropping unknown copied fields; replace these permissive schemas with explicit field definitions when its legacy contracts are documented.
- The Awaaab React frontend uses its signed-in, email-verified account for AutoHub access; vehicle ownership is derived from that user's `_id` in the verified token, not request fields. Public marketplace responses omit owner IDs and email addresses.
- Registered Visitors/Clients start a vehicle conversation with `POST /auto/conversations`, then read/reply through `/auto/conversations/:id` using authenticated account ownership. Message writes are rate-limited.
- Signed-in AutoHub owners use `GET /auto/messages/inbox`, `GET /auto/messages/inbox/:id`, and `POST /auto/messages/inbox/:id/reply`. The backend scopes conversations by the verified account `_id`; visitor contact details are shared only with that listing's owner and the guest thread.
- Vehicle photos use the private `AUTOHUB_S3_BUCKET`. `POST /auto/usedCars/photo-upload-url` returns a five-minute presigned PUT scoped to the signed-in owner's `autohub/<userId>/` prefix; public and owner vehicle APIs return one-hour presigned GETs. The App Runner instance role needs only `s3:GetObject` and `s3:PutObject` on that prefix; no S3 credentials belong in the frontend.
- `POST /auto/user` provisions the signed-in account, `GET /auto/user` reads its profile, and `GET /auto/usedCars/viewAll` lists public inventory.
- `GET /auto/usedCars`, `POST /auto/usedCars`, `POST /auto/usedCars/edit`, and `POST /auto/usedCars/delete` require a valid account token and restrict mutations and private listings to that account's email.
- Registered Visitors/Clients can return to `/user` to list and continue their stored AutoHub conversations, including after a new sign-in.
- Signed-in AutoHub owners use `GET /auto/messages/inbox`, `GET /auto/messages/inbox/:id`, and `POST /auto/messages/inbox/:id/reply`. The backend scopes conversations by the verified account `_id`; visitor name/email are visible only to that vehicle's owner and the guest thread.
- AutoHub has no separate login or registration endpoints; it uses the same verified Awaaab account and JWT flow as other protected Awaaab features.

### Updating copied AutoHub vehicles

- Legacy databases are already copied into the Awaaab Atlas cluster; this utility does not copy databases or create duplicate AutoHub accounts.
- `npm run migrate:autohub` is read-only and reports whether copied vehicle owners match verified Awaaab accounts, whether IDs conflict, and how many records need an `ownerId` backfill.
- After supplying a rotated `MONGODB_URI_USERS`, review the plan and run `npm run migrate:autohub -- --apply` to add `auto` to matching users' `platforms` and backfill stable vehicle owner IDs in `CarShop.usedCars`. Apply mode refuses to write if owners are missing/unverified or IDs conflict.
- The shared Awaaab user record stores platform membership in `platforms`; old copied AutoHub user/password documents are not used for authentication.

If you want me to continue: I can centralize multiple DBs (create separate connections), add simple integration tests, or replace hard-coded data with seeded collections.
