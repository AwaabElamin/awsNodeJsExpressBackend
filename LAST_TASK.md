# Last Task Snapshot

Updated: 2026-10-22

Auto-update policy:
- Update this file at the end of every completed request.
- If no files are changed in a request, keep this file updated anyway.
- Purpose: give an instant answer to "what was last task we did?" after reopen.

Local note (2026-10-22):
- Public registration now creates `Visitors`; explicit verified `/users/workspace` upgrade creates a Client. Existing roles are preserved. Inquiry routes require authentication and bind sender/access to the account; platform enrollment blocks Visitors. Setup-admin preserves Visitors. 14 tests pass and local backend restarted; no production deployment.
- Seller replies now use the seller's external email app. Legacy owner reply API returns HTTP 409 after ownership checks, without SMTP or chat writes. Removed the proposed Awaaab SMTP reply implementation; account verification/reset mail is unchanged. Targeted reply/location tests pass (7 total).
- Added required country/state fields to car persistence and public listing projection. Create/edit reject blank, missing, non-string, or oversized locations with HTTP 400; 4 targeted tests pass.
- Assigned sample Saudi/UAE locations to all 8 Hashim cars (4 per country) in the real database without changing vehicle content or ownership. Local updated backend runs on port 3001 against that database; no production deployment was performed.
- Reassigned the four orphaned older car listings to Hashim Hash in the real CarShop database using a transaction after confirming the previous client profiles were absent and no conversations or private S3 photos required transfer. Hashim now owns all 8 listings; names/emails resolve from his actual profile.
- Added four sample vehicle listings to the configured Atlas-backed `CarShop.usedcars` collection for an existing verified AutoHub client. The listings are labeled `[SAMPLE]`; no account settings were changed.
- `scripts/seedSampleAutoCars.js` is safe to rerun, dry-run by default, and requires an email argument plus `--apply` to write.
- Added `scripts/startLocalAutoSellerInfo.js` and `start:local-autohub-sellers` for a loopback-only, read-only local seller profile lookup. It maps listing owner IDs/emails to the shared users database and never writes to MongoDB.

Last completed task:
- **VERSION CONTROL:** Prepared the completed marketplace, Visitors/profile, and stored-chat changes for commit and push on `dev`, including related tests and sample/local seller utilities. The pre-existing local-only `scripts/seedSampleProperties.js` is intentionally excluded. No environment files or credentials are included; no production deployment requested.

Previous completed task:
- **COMPLETED:** Switched both AutoHub and Groceries to persisted two-way in-app chat. Added visitor account inbox/read/reply routes, seller reply writes, unread updates, owner/visitor-scoped atomic MongoDB operations, and reply rate limits. New AutoHub chats bind visitor IDs; legacy chats recover by immutable authenticated email without requiring browser tokens. Existing history preserved.
- Profile edits remain available to Visitors without a Client upgrade; email changes are explicitly rejected and editable fields are allowlisted. 25 targeted tests pass, including real-DB persistence/access isolation/unread/legacy recovery with exact fixture cleanup. Local updated backend runs on port 3001 against the real database; no public deployment or chat email sending.

Previous completed task:
- **COMPLETED:** Extended Groceries with required Country/State product validation and persistence, authenticated visitor inquiries, owner-scoped private inbox/read routes, shared Gmail draft reply UI, local-only profile lookup, and explicit Visitors workspace-enrollment rejection. Added 6 grocery tests; all 20 targeted backend tests pass and frontend build/lint passes.
- The configured Groceries database was empty. Created two labeled Hashim samples with Saudi/UAE locations and enabled his grocery membership using the dry-run-by-default, transaction-based, rerunnable `scripts/seedSampleGroceries.js`. Other records are preserved. Local updated API runs on port 3001 against the real database; no public deployment or real email sending.

Previous completed task:
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
