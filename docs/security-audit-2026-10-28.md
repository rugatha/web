# Security review — 2026-10-28

## Scope and verified controls

Reviewed the GitHub Pages packaging workflow, Firebase Firestore and Storage rules, `/admin`, `/experience/register`, `/experience/feedback`, and `/experience/cons/d3/2026`. This is a source review, not a production penetration test. No live production attack traffic was generated.

`shared/auth.js` still contains Realtime Database reads and a visit-award transaction. This repository has no Realtime Database rules file, so production Realtime Database access could not be verified from source. Inspect its deployed rules and usage in the Firebase console; if this legacy path is no longer used, remove it before treating Firestore and Storage rules as a complete backend audit. The Firebase web API key in `shared/firebase.config.js` is a public app identifier, not a server secret.

- Firestore and Storage default to deny. Member records and registration answers are admin-only or owner-only. Public registration writes validate fields and require an atomic seat increment; a client cannot set the seat count independently.
- Admin tables escape user supplied text before inserting HTML. The admin UI checks the verified email, and backend rules check a custom `admin` claim or the exact verified admin email. The latter is an intentional account recovery path and should be protected with MFA.
- The Pages packaging script includes runtime files only; Firebase rules, tests, migration scripts and local logs are excluded.

## Changes made here

The `members/{key}` `get` rule previously allowed any signed-in user to read any missing member document. The difference between a successful missing read and a permission error on an existing document revealed whether arbitrary member numbers were allocated. It now allows only the caller's legacy UID path and the next member number needed by the first-registration transaction. A regression assertion covers both allowed paths and an unrelated missing member number.

## High priority production controls

### Public form abuse and Firestore cost

`experienceFeedback` accepts unlimited anonymous creates with valid fields and random IDs. A script can bypass the form and send many writes directly to Firestore. Registration and D3 booking rules cap seats, but an attacker can still occupy all seats and repeatedly send rejected requests. The browser's `submitting` flag is only a user experience control. Firestore rules cannot rate limit by IP or reliably tell a real person from a script.

1. Register the production web app with Firebase App Check using reCAPTCHA Enterprise. Add the public site key to the web app and initialize App Check before every Firebase client request, including admin, member and form pages. Monitor App Check metrics before enforcing Firestore and Storage. **Do not enable enforcement until every production Firebase entry point has been updated and verified**, or legitimate site features will fail. App Check reduces requests from unauthorized clients but is not an IP rate limiter and does not prevent an attacker controlling a valid browser from submitting repeatedly.
2. Move public form writes behind a server endpoint (for example Cloud Functions with App Check verification). The endpoint should verify a human challenge on each submission, enforce per-IP and per-device rate limits, cap request body size, reject duplicates, and use an atomic transaction for seats. Deny direct client create/update on the form collections after the endpoint is deployed. This requires server infrastructure and an intentional migration; changing the rules alone would disable the current forms.
3. Set billing budget alerts and monitor Firestore read/write counts and denied requests. Have a documented emergency switch to close registration in the event documents and to deny feedback creates through a rules deployment. A budget alert is not a hard spending cap.

### Website traffic floods

GitHub Pages serves the static site, while Firebase serves the dynamic requests. A CDN/WAF in front of the custom domain can add request rate limits for page traffic, but it cannot rate limit direct calls to Firebase. Use the backend endpoint above for form traffic. Avoid a global Firestore counter as a makeshift rate limiter: every submission would contend on one document and could deny legitimate registrations under load.

### Admin account

Require MFA for the account `rugathadnd@gmail.com`, review active sessions and custom-claim assignments, and remove unused helper credentials. Backend rules, not the hidden admin page, are the security boundary. Consider moving all admin access to explicit custom claims once the recovery and provisioning process is established.

## Verification limits

The full `npm run test:rules` suite passed (29/29) using the installed Homebrew JDK 21 after `npm run test:catalog:setup`. `node --test tests/admin-dashboard.test.mjs` also passed. Firestore rules must be deployed separately from the GitHub Pages workflow.

References: [Firebase App Check enforcement](https://firebase.google.com/docs/app-check/enable-enforcement), [Firebase security checklist](https://firebase.google.com/support/guides/security-checklist), [Firestore scaling and contention](https://firebase.google.com/docs/firestore/best-practices).
