Project feature

This branch contains the `project` feature split from the main app.

What is here
- Routes: `routes/project.js`
- Controller: `controllers/project.js`
- Model: `models/project.js`

How to work on this feature
1. Checkout this branch: `git checkout project`
2. Install dependencies: `npm install`
3. Run the app locally: `npm start` (or `npx nodemon app.js`)
4. Make changes, run tests (none provided), then commit and push.

Notes
- The main branch has had the `project` files removed and `app.js` was updated to only mount the project router if `routes/project.js` exists.
- When re-merging this feature back into main, ensure `app.js` is adjusted or the route files are restored.
