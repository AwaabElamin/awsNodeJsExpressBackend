# Last Task Snapshot

Updated: 2026-10-13

Auto-update policy:
- Update this file at the end of every completed request.
- If no files are changed in a request, keep this file updated anyway.
- Purpose: give an instant answer to "what was last task we did?" after reopen.

Last completed task:
- **COMPLETED:** Deployed AutoHub routes using the shared Awaaab `users` collection and `users.platforms` membership.
- CarShop vehicles are owned by the Awaaab user `_id`; the copied-data backfill linked all four listings to one verified Awaaab account without duplicating cars.
- Visitors can message vehicle owners with hashed guest access tokens; owners read/reply through authenticated inbox routes. Private S3 photo upload/read URLs use owner-scoped keys.
- MongoDB named databases share the authenticated `MONGODB_URI_USERS` client; App Runner runs Node.js 22.

Files affected:
- app.js
- lib/db.js
- controllers/auto.js
- controllers/autoUsedCars.js
- controllers/autoMessages.js
- controllers/autoPhotos.js
- middleware/requireAutoUser.js
- middleware/requirePlatform.js
- middleware/limitAutoMessages.js
- middleware/limitAutoConversationStarts.js
- models/users.js
- models/autoUsedCar.js
- models/autoMessage.js
- models/delivery.js
- routes/auto.js
- scripts/migrateAutoHub.js
- README.md
- package.json

Current deployment:
- App Runner service: `BackendNodeJsAppRunner`
- Region: `us-east-1`
- Backend: `https://epdqkqaj3f.us-east-1.awsapprunner.com/`
- Runtime uses the `awaaab/backend/jwt-secret` and `awaaab/backend/mongodb-uri-users` Secrets Manager secrets, with `AUTOHUB_S3_BUCKET=awaaab-autohub-photos-956951178618`.
- Commit `62c127f` fixed shared named-connection handshakes; App Runner deployment succeeded on Node.js 22.

Local note (2026-10-21):
- Property management was integrated and pushed to `dev` (backend `5fd2075`, frontend `90c092e`).
- `scripts/seedSampleProperties.js` is kept local and uncommitted. It inserts 4 sample vacant properties ("Sample - ...") into the `PropertyManagement` DB. It has already been applied to Atlas, is dry-run by default (`--apply` to write) and is safe to re-run.
- To remove the samples, delete the "Sample - ..." properties from the admin Properties screen.

Open follow-up:
- Replace the permissive dynamic Delivery schemas with explicit schemas once its legacy collection contracts are documented.
- Perform a real authenticated photo upload and visitor/owner messaging exchange with a test client account; only route guards and signing were tested during deployment.
