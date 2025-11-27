**Purpose**: Provide immediate, actionable guidance for AI coding agents working on this Express + MongoDB codebase.

- **Project Root:**: `app.js` is the app entry point and starts the server on port `3000`.
- **Start Command:**: `npm start` (runs `node app.js`). There is no `PORT` environment handling—`app.js` calls `app.listen(3000)` directly.

**Architecture Overview**

- **Express app**: `app.js` wires middleware and routes and exposes JSON error responses.
- **Routes layer**: `routes/` contains route definitions (e.g., `routes/auth.js`, `routes/users.js`, `routes/project.js`, `routes/mainMain.js`, `routes/auto.js`). Routes map to controller functions.
- **Controller layer**: `controllers/` implements request handling (e.g., `controllers/auth.js`, `controllers/mainMain.js`). Controllers call `models/` for data operations.
- **Models layer**: `models/` contains Mongoose schemas and static methods (e.g., `models/users.js`). Models often call `mongoose.connect()` directly and return results via static methods.
- **JWT handling**: `jwt/jwtManager.js` implements `generate` and `verify` methods. The JWT secret and expiry are read from `JWT_SECRET` and `JWT_EXPIRES_IN` environment variables; the code will warn if `JWT_SECRET` is missing.
- **DB connections**: Multiple hard-coded MongoDB Atlas connection strings exist across files (e.g., `models/users.js`, `controllers/mainMain.js`, `connecting.js`). There is no centralized connection manager in active use.

**Project-specific patterns**

- **Model pattern:**: Models are classes with static methods that call `mongoose.connect(connectionString)` inside methods and then `disconnect()` in some cases; see `models/users.js` for examples (methods like `findByEmail`, `create`).
- **Auth pattern:**: `controllers/auth.js` uses `bcrypt.compareSync` for password checks and returns `{ status: 'success', accessToken: token, email, _id }` on success. The controller expects login payload `email` and `password` in `req.body`.
- **Authorization header:**: Protected routes expect `Authorization: Bearer <token>`; `controllers/auth.js` splits `req.headers.authorization` and verifies via `new JwtManager().verify(token)`.
- **Responses:**: Controllers typically return JSON shapes like `{ status: 'success', data: ... }` or `{ status: 'fail', message: ... }`. The app-level error handler returns `{ status: 'error', data: err }`.
- **Views & static:**: View engine is `jade` and templates appear under `views/`. Static assets served from `public/`.

**Where to change or add code**

- **Add endpoints**: Create a route in `routes/` that delegates to a new controller function in `controllers/`, which calls into `models/` for DB work. Follow the `users` controller/model pattern.
- **Add model methods**: Add static methods on the corresponding model class (Mongoose model defined via `mongoose.model`). Keep pattern of returning simple objects/arrays as controllers expect.
- **Auth changes**: If modifying authentication, update `jwt/jwtManager.js` and `controllers/auth.js`. Note: the secret and connection strings are hard-coded—be careful not to commit production secrets.

**Developer workflows & commands**

- **Run locally:**: `npm start` (or `node app.js`). The app listens on `3000` by default.
- **Enable auto-reload during development:**: Use `npx nodemon app.js` (project has `nodemon` in dependencies).
- **No automated tests found:**: There are no test scripts in `package.json`.

**Integration points & external dependencies**

- **MongoDB Atlas**: The app uses multiple Atlas connection strings; search for `mongodb+srv://` to find where DBs are used. Example files: `models/users.js`, `connecting.js`, `controllers/mainMain.js`.
- **JWT**: `jsonwebtoken` is used via `jwt/jwtManager.js` and `controllers/auth.js`.
- **Bcrypt**: `bcrypt` is used for password hashing and comparison in `controllers/auth.js` and `models/users.js`.

**Agent-specific guidance (do this when editing)**

- **Avoid committing credentials**: If you change connection strings or secrets, replace them with environment variables and add instructions in the repo README before committing.
- **Follow existing patterns**: Keep controllers thin — orchestrate model calls and format responses as `{ status: ..., data/message: ... }`.
- **DB connections**: Prefer to leave DB connection behavior unchanged unless centralizing it; many files call `mongoose.connect()` directly—refactor carefully and update all callers.
- **JWT usage**: Use `new (require('./jwt/jwtManager'))().generate(data)` and `verify(token)` as in `controllers/auth.js` to remain consistent.

**Key files to inspect when debugging or extending**

- **Entrypoint**: `app.js`
- **Routes**: `routes/*.js` (map endpoints to controllers)
- **Controllers**: `controllers/*.js` (business logic)
- **Models**: `models/*.js` (Mongoose schemas and static methods)
- **JWT helper**: `jwt/jwtManager.js`
- **DB helper**: `connecting.js` (exists but models often connect directly)

If anything here is unclear or you want the file merged differently (for example, adding environment-variable instructions, or stricter conventions), tell me which parts to change and I will update the file.
