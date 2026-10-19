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

## Client project briefs

- `POST /client-briefs` accepts client submissions from the public Awaaab project brief form.
- `GET /client-briefs` requires a valid account token and an Admin role; the role is rechecked against the user record on each request.
- `/admin/users` requires the same Admin authorization for account listing, Client creation, Client profile updates, and Client deletion. Responses never include password hashes or verification tokens.
- Account listing includes the Admin record for visibility; the API only permits CRUD on `Client` records. Client creation requires email verification; roles, emails, and passwords cannot be changed through profile editing.
- Public signups always receive the `Client` role. They cannot choose or submit a role.
- Configure the sole Admin with `ADMIN_PASSWORD` and `MONGODB_URI_USERS` in the environment, then run `npm run setup:admin`. The script hashes the password, provisions the username `Admin`, and demotes any other Admin accounts to `Client`.
- The Admin password is never stored in source code. Use a strong password and do not print it in logs.
- Configure `JWT_SECRET` as an App Runner runtime secret referencing AWS Secrets Manager, with an instance role limited to `secretsmanager:GetSecretValue` for that secret. Existing sessions must sign in again after the JWT signing key changes.

## AutoHub

- AutoHub is mounted under `/auto`; vehicle data uses the copied `CarShop.usedCars` collection, while identity and platform access use the shared Awaaab `users` collection (`platforms` records enabled workspaces).
- One `MONGODB_URI_USERS` connection can access the copied `users`, `Delivery`, `resume`, and `CarShop` databases; `MONGODB_DB_DELIVERY`, `MONGODB_DB_RESUME`, and `MONGODB_DB_CARSHOP` select each platform database. Set per-platform URI overrides only if a platform is later moved to another cluster.
- Resume has explicit collection schemas in `models/resume.js`. Delivery uses `models/delivery.js` to expose per-collection schemas without dropping unknown copied fields; replace these permissive schemas with explicit field definitions when its legacy contracts are documented.
- The Awaaab React frontend uses its signed-in, email-verified account for AutoHub access; vehicle ownership is derived from that user's `_id` in the verified token, not request fields. Public marketplace responses omit owner IDs and email addresses.
- Visitors can start a vehicle conversation with `POST /auto/conversations`, then read/reply through `/auto/conversations/:id` using the random guest token returned at creation. Only a SHA-256 token hash is stored, and message writes are rate-limited.
- Signed-in AutoHub owners use `GET /auto/messages/inbox`, `GET /auto/messages/inbox/:id`, and `POST /auto/messages/inbox/:id/reply`. The backend scopes conversations by the verified account `_id`; visitor contact details are shared only with that listing's owner and the guest thread.
- Vehicle photos use the private `AUTOHUB_S3_BUCKET`. `POST /auto/usedCars/photo-upload-url` returns a five-minute presigned PUT scoped to the signed-in owner's `autohub/<userId>/` prefix; public and owner vehicle APIs return one-hour presigned GETs. The App Runner instance role needs only `s3:GetObject` and `s3:PutObject` on that prefix; no S3 credentials belong in the frontend.
- `POST /auto/user` provisions the signed-in account, `GET /auto/user` reads its profile, and `GET /auto/usedCars/viewAll` lists public inventory.
- `GET /auto/usedCars`, `POST /auto/usedCars`, `POST /auto/usedCars/edit`, and `POST /auto/usedCars/delete` require a valid account token and restrict mutations and private listings to that account's email.
- Visitors can start a vehicle conversation with `POST /auto/conversations`, then read/reply through `/auto/conversations/:id` using the one-time guest token returned at creation. Only a SHA-256 token hash is stored; write routes are rate-limited.
- Signed-in AutoHub owners use `GET /auto/messages/inbox`, `GET /auto/messages/inbox/:id`, and `POST /auto/messages/inbox/:id/reply`. The backend scopes conversations by the verified account `_id`; visitor name/email are visible only to that vehicle's owner and the guest thread.
- AutoHub has no separate login or registration endpoints; it uses the same verified Awaaab account and JWT flow as other protected Awaaab features.

### Updating copied AutoHub vehicles

- Legacy databases are already copied into the Awaaab Atlas cluster; this utility does not copy databases or create duplicate AutoHub accounts.
- `npm run migrate:autohub` is read-only and reports whether copied vehicle owners match verified Awaaab accounts, whether IDs conflict, and how many records need an `ownerId` backfill.
- After supplying a rotated `MONGODB_URI_USERS`, review the plan and run `npm run migrate:autohub -- --apply` to add `auto` to matching users' `platforms` and backfill stable vehicle owner IDs in `CarShop.usedCars`. Apply mode refuses to write if owners are missing/unverified or IDs conflict.
- The shared Awaaab user record stores platform membership in `platforms`; old copied AutoHub user/password documents are not used for authentication.

If you want me to continue: I can centralize multiple DBs (create separate connections), add simple integration tests, or replace hard-coded data with seeded collections.
