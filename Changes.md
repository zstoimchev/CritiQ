# CritiQ — Backend Hardening Report

## What Was Broken

### Problem 1 — API Wiring + Standardized Error Handling

| #  | File                           | Bug                                                                                                                      | Impact                                                  |
|----|--------------------------------|--------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------|
| 1  | `app.js`                       | All four route mounts were **commented out**                                                                             | **Zero API endpoints reachable**                        |
| 2  | `app.js`                       | `cors()` middleware registered **twice**                                                                                 | Redundant overhead, confusing config                    |
| 3  | `routes/users.js`              | Imported `createComapny, loginCompany` from `../controller/user` — those names don't exist there                         | `ReferenceError` on startup, logged 50+ times           |
| 4  | `controller/user.js`           | Used `CONSTANTS.USER_ROLE.COMPANY` without importing `CONSTANTS`                                                         | `ReferenceError` on every signup                        |
| 5  | `app.js`                       | `expressErrorLogger` used before import in server.js era (line 184)                                                      | `uncaughtException` crash loop (visible in Feb-23 logs) |
| 6  | `services/question.js`         | Required `../models/question` (lowercase) but file is `Question.js`                                                      | `MODULE_NOT_FOUND` on case-sensitive Linux filesystems  |
| 7  | `lib/wrapAsync.js`             | Previously required `./utils` which didn't exist                                                                         | `MODULE_NOT_FOUND` crash loop                           |
| 8  | All controllers                | Mix of raw `try/catch` vs no error handling, inconsistent response shapes (`{ message }` vs `{ error }` vs `{ result }`) | Unpredictable client-side handling                      |
| 9  | `controller/customer.js` (old) | `phoneSchema` referenced but not defined                                                                                 | `ReferenceError` (Feb-24 logs)                          |
| 10 | `services/question.js`         | `QuestionSetModel` declared twice (`const QuestionSetModel` in top + duplicate in file)                                  | `SyntaxError` crash                                     |
| 11 | `controller/conn/db.js`        | References `DB` variable that is never defined                                                                           | Would crash on import                                   |

---

## What Was Standardized

### 1. Route Mounting (app.js)
All four routes are now **enabled and mounted** under `config.server.route`:

```
GET  /api/pingServer
POST /api/users/signup
POST /api/users/login
POST /api/customers/create
POST /api/customers/login
POST /api/customers/sendotp
POST /api/customers/sendmoney
GET  /api/customers/getbalance
GET  /api/customers/getall
POST /api/questions/
GET  /api/questions/:id
POST /api/phone/
GET  /api/phone/
```

### 2. Unified Response Contract
Every endpoint now returns the same JSON envelope:

```jsonc
// Success
{ "result": "success", "code": 200, "message": "...", "data": { ... } }

// Error (all errors go through centralized middleware)
{ "result": "error",   "code": 404, "desc": "...", "stack": "..." }
```

Helper used: `server/lib/response.js` — `success()`, `created()`, `httpError()`.

### 3. Async Error Pattern
All controllers use **`wrapAsync`** — no scattered try/catch. Errors thrown with `httpError(statusCode, message)` propagate cleanly to the centralized error handler in `app.js`.

```js
// Old (inconsistent)
const login = async (req, res) => {
    try { res.status(200).json({ message: '...' }); }
    catch (err) { res.status(500).json({ error: err.message }); }
};

// New (centralized)
const login = async (req, res) => {
    const user = await UserService.getOne({ walletAddress });
    if (!user) throw httpError(401, 'Wallet address not found.');
    return success(res, { user }, 'Login successful!');
};
module.exports = { login: wrapAsync(login) };
```

### 4. Defensive Validation on ≥ 3 Endpoints
A reusable `validate(fields[])` middleware is applied at the router level (before controllers execute):

| Route                       | Required fields validated                                                              |
|-----------------------------|----------------------------------------------------------------------------------------|
| `POST /users/signup`        | `companyName`, `companyEmail`, `walletAddress`, `companyLogoUrl`, `companyDescription` |
| `POST /users/login`         | `walletAddress`                                                                        |
| `POST /customers/create`    | `companyEmail`, `walletAddress`                                                        |
| `POST /customers/login`     | `walletAddress`                                                                        |
| `POST /customers/sendotp`   | `email`, `otp`                                                                         |
| `POST /customers/sendmoney` | `key`                                                                                  |
| `POST /questions/`          | `productName`, `productDescription`, `productImageUrl`, `questions`                    |
| `POST /phone/`              | `sid`, `id`, `phone`                                                                   |

Email format is also validated where applicable via `validateEmail()`.

### 5. Deduplication & Misc Fixes
- Removed duplicate `cors()` registration
- Removed duplicate controller files (`*Controller.js` vs `*.js`) — use clean `*.js` versions only
- Fixed `CONSTANTS` import in `user.js`
- Fixed model import casing in `services/question.js` → `../models/Question`
- Fixed `services/user.js` → `../models/User`
- `wrapAsync` now correctly uses `./helper` (was `./utils` — non-existent)

### 6. Rate Limiting
Global: 100 req / 15 min. Sensitive endpoints get a **tighter 20 req / 15 min** limit:
- `POST /users/signup`, `POST /users/login`
- `POST /customers/login`, `POST /customers/sendotp`, `POST /customers/sendmoney`

### 7. 409 Duplicate Detection
Before hitting the MongoDB unique-index constraint (which gives an ugly error), controllers now **pre-check** for existing records and return a clean `409 Conflict`.

---

## Problem 2 — Customer & Question Module Hardening

### Service Layer Separation
Business logic (blockchain calls, email sending, validation) stays in **controllers**. All DB access goes through **service** objects (`UserService`, `CustomerService`, `QuestionService`, `PhoneService`).  
Each service exposes: `create`, `getAll`, `getOne`, `getById`, `updateById`.

### Security Improvements
- `mongoSanitize()` — prevents NoSQL injection via `$` keys
- `xss()` — strips XSS payloads from request bodies
- `helmet()` — sets secure HTTP headers
- Sender secret key moved to `process.env.DIAM_SENDER_SECRET`
- SMTP credentials use env vars (`SMTP_MAIL`, `SMTP_PASS`) — no hardcoded credentials

---

## Running Tests

```bash
cd server
npm install
npx jest --runInBand --forceExit
```

Tests cover: user signup (happy + duplicate + missing fields + bad email), customer login (happy + missing + not found), question creation (happy + missing fields + empty array + invalid type), and unknown route 404.

No live database or blockchain connection is needed — services are mocked at the test boundary.