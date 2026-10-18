# Spellbook browser acceptance

These tests exercise the real spells HTML, shared modules, Firebase Web SDK 12.7.0 and Security Rules in Chromium. They use only the `demo-rugatha` Auth / Firestore / Storage Emulators. No production credentials or player data are used. Browsers block requests to hosts other than localhost and 127.0.0.1.

## Run

Use Node 24, Python 3 and Java 21 or newer:

```sh
npm ci
npm run test:browser:setup
npm run test:all
```

`test:browser:setup` first downloads the pinned public spell catalog from Firebase Storage into the OS temp directory and verifies SHA-256; the full payload is never committed to Git. Set `RUGATHA_SPELL_CATALOG_TEST_DIR` to override this external cache. It then downloads the existing Firebase browser SDK from Google's official CDN to the OS temp directory and installs Playwright Chromium. Set `RUGATHA_FIREBASE_TEST_SDK_DIR` to override the SDK directory, and `PLAYWRIGHT_BROWSERS_PATH` to override Playwright's browser cache. These are test assets only; production continues using its existing CDN imports.

`npm run test:browser` starts its own Emulators and loopback HTTP server on port 8765. Run it separately from other Emulator commands. Each test resets only demo Emulator data. The server injects a test toolbar and demo config; it never edits the production config to enable sync. Do not run this server publicly. To interact manually, run:

```sh
npx firebase emulators:exec --project demo-rugatha --only auth,firestore,storage "python3 scripts/spellbook-browser-server.py"
```

Then open `http://127.0.0.1:8765/toolbox/spells/`. `localhost:8765` provides independent browser-origin storage. The test toolbar can sign in demo accounts, write a legacy source, pause writes, disable sync and inject permission denial. Restore permission after a denial test. Physical offline tests should use Playwright context network settings; disabling the SDK network primarily exercises listeners and cache, and is not a substitute for blocking all requests.

## Coverage and limits

The suite covers guest persistence, first-time member mapping, real-time sync between tabs and independent contexts, import receipts / unknown names / interrupted imports, simultaneous edits, account isolation, offline recovery, permission denial, token expiration, staged rollout, phone viewport, PWA cache activation and shared-module regression. Pure service-worker tests additionally exercise the production-host cache behavior, including fresh feature flags, offline navigation and only the two pinned public Storage catalog responses. The catalog failure case displays HTTP errors without a repository fallback; the shared-source case checks character sheet and class-reference consumers.

Independent contexts simulate separate devices; the phone test emulates a 390 × 844 touch viewport. This does not claim physical iOS / Android testing, real production permissions, production read/write usage or live rollout observation. The legacy writer case simulates the exact old key write in another tab. The PWA browser test uses the real worker's localhost branch; production-host caching is covered separately by the worker tests.

HTML reports are written to `playwright-report/`; failed cases retain screenshots and traces under `test-results/`. These generated artifacts are ignored by Git. The mobile case also produces a full-page screenshot for visual review.
