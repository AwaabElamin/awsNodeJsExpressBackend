# BuildSudan integration

The optional API is mounted at `/buildsudan/api`, with the standalone API paths
after `/api` preserved (for example `/settings/admin/login`, `/requests`,
`/applications`, `/admin`, `/contact`, and `/health`). It keeps its original
response shapes. Existing Awaaab routes are unchanged.

Set `BUILDSUDAN_ENABLED=true`, `BUILDSUDAN_MONGODB_URI`,
`BUILDSUDAN_DB_NAME`, and `BUILDSUDAN_ADMIN_JWT_SECRET`. Use an existing,
dedicated BuildSudan database and a secret different from `JWT_SECRET`. The
explicit database name overrides any database in the URI. The integration
refuses known Awaaab database names; operators must also verify that their
chosen database is not used by another application, including on aliases or
other MongoDB servers. It never falls back to the Awaaab URI or secret.
Missing or invalid setup returns 503 at the integration mount without stopping
the host. Database-dependent endpoints return 503 when disconnected; health
does not imply database readiness. A connection failure is logged without its
URI; a failed initial connection retries every 30 seconds without blocking the
host. Startup does not create core roles, users, collections or indexes: use
an already provisioned BuildSudan database, including its roles and indexes.
The application still writes to that database when its normal API is used.

For isolated local development, set `LOCAL_BUILDSUDAN_ENABLED=true` in
`.env.local`, start the local MongoDB container, and run `npm run start:local`.
The local launcher uses a separate `buildsudan_local` database on port 27018,
generates a temporary BuildSudan JWT secret unless
`LOCAL_BUILDSUDAN_JWT_SECRET` is set, and disables BuildSudan email delivery.
Local data and accounts are separate from the standalone production database.
Set `LOCAL_BUILDSUDAN_FRONTEND_URL` to the local web origin when it differs
from `http://127.0.0.1:5173`. The JWT secret changes on each restart unless
explicitly configured, invalidating local sessions.

Set `BUILDSUDAN_FRONTEND_URL` to the public frontend URL (also allowed by CORS).
It can be a comma-separated list of allowed origins; the first nonempty URL is
used for verification and assessment notification links.
The standalone localhost and injaz.info CORS origins remain allowed. Configure
mail with `BUILDSUDAN_SMTP_USER` and either all of
`BUILDSUDAN_GOOGLE_CLIENT_ID`, `BUILDSUDAN_GOOGLE_CLIENT_SECRET`,
`BUILDSUDAN_GOOGLE_REFRESH_TOKEN`, or `BUILDSUDAN_SMTP_PASS`. Optional
`BUILDSUDAN_SMTP_HOST`, `BUILDSUDAN_SMTP_PORT`, `BUILDSUDAN_SMTP_SECURE`,
and `BUILDSUDAN_CONTACT_RECEIVER_EMAIL` retain the standalone defaults.
Contact delivery and verification email require working SMTP credentials.
Do not put real credentials in `.env.example`.

The existing standalone accounts and bcrypt hashes can be used only when
pointing at their existing BuildSudan database. No accounts or data are copied.
To retain unexpired standalone admin/engineer sessions, configure
`BUILDSUDAN_ADMIN_JWT_SECRET` with the existing standalone
`ADMIN_JWT_SECRET`, not the Awaaab `JWT_SECRET`. Changing that secret invalidates
existing sessions. Engineer sessions also require the existing active engineer
account in the dedicated BuildSudan database. Do not copy secret values into
documentation or source control.
The source user schema omitted fields its email-verification controller uses;
the integrated schema declares them so newly generated verification tokens can
persist. Existing accounts without an `emailVerified` field retain the source
login behavior. Previously issued tokens that were not stored cannot work.

Security limitation inherited from the standalone API: client profile updates
and request lookup use a supplied username without authenticating the client.
Do not enable this API for public use until client authorization is redesigned
and the clients are updated accordingly. CORS is not an authorization control.
