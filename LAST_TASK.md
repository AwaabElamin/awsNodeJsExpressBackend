# Last Task Snapshot

Updated: 2026-10-12

Auto-update policy:
- Update this file at the end of every completed request.
- If no files are changed in a request, keep this file updated anyway.
- Purpose: give an instant answer to "what was last task we did?" after reopen.

Last completed task:
- **COMPLETED:** Subscriber-created accounts are assigned Client; a one-time setup script provisions username Admin and demotes every other account to Client.
- Login accepts username or email; Admin credentials are hashed from an environment variable, never stored in source.
- Client brief APIs remain protected by the database-backed Admin role.

Files affected:
- app.js
- controllers/auth.js
- controllers/clientBriefs.js
- jwt/jwtManager.js
- middleware/requireAdmin.js
- models/clientBrief.js
- models/users.js
- routes/clientBriefs.js
- README.md
- package.json
- scripts/setupAdmin.js

Current deployment:
- ECS service: `buildsudan-backend-a843`
- Region: `us-east-1`
- Image: `buildsudan-backend:ecs-migration-8`
- Health: `https://bu-e09b2728646745cfa68e30c6888b078e.ecs.us-east-1.on.aws/health`

Open follow-up:
- Run `npm run setup:admin` with `ADMIN_PASSWORD` and `MONGODB_URI_USERS` configured to establish the sole Admin account.
- Configure `JWT_SECRET` and deploy the backend changes before the frontend.
