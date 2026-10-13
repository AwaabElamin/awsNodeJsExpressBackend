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
- Public signups always receive the `Client` role. They cannot choose or submit a role.
- Configure the sole Admin with `ADMIN_PASSWORD` and `MONGODB_URI_USERS` in the environment, then run `npm run setup:admin`. The script hashes the password, provisions the username `Admin`, and demotes any other Admin accounts to `Client`.
- The Admin password is never stored in source code. Use a strong password and do not print it in logs.
- Configure `JWT_SECRET` in the backend environment before deployment. Existing sessions must sign in again after the JWT signing key changes.

If you want me to continue: I can centralize multiple DBs (create separate connections), add simple integration tests, or replace hard-coded data with seeded collections.
