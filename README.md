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

What changed
- Centralized MongoDB connection in `lib/db.js` and established the connection during server startup in `bin/www`.
- Removed per-method `mongoose.connect()` calls in `models/users.js` and adjusted controllers to assume an active DB connection.
- Moved JWT secret and expiry to environment variables (`JWT_SECRET`, `JWT_EXPIRES_IN`). See `.env.example`.
- `app.js` now exports the express app; `bin/www` starts the server.

If you want me to continue: I can centralize multiple DBs (create separate connections), add simple integration tests, or replace hard-coded data with seeded collections.
