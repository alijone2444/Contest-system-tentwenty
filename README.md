# 🏆 Contest Participation System

A Contest Participation System where users participate in contests, answer questions (single-select, multi-select, true/false), get scored, climb the leaderboard, and win prizes. Built for the **tentwenty** interview test.

**Stack:** Next.js (App Router) · TypeScript · PostgreSQL (Neon) · Prisma · JWT (jose) · Zod

## 🔗 Live Demo

**https://contest-system-tentwenty.vercel.app**

Test accounts (password for all: `password123`):

| Role | Email | What to try |
| --- | --- | --- |
| ADMIN | `admin@example.com` | Access everything; create contests & finalize prizes via API/Postman |
| VIP | `vip@example.com` | Can join both the normal and the **VIP Masters Cup** contest |
| Normal user | `user@example.com` | Can join normal contests; gets **403** on the VIP contest |
| Normal user | `sana@example.com` | Has an in-progress contest + a won prize (see *My History*) |
| Guest | *(no login)* | Can view contests & leaderboards but cannot participate (401) |

Suggested 2-minute walkthrough: browse as guest → login as `user@example.com` → join *General Knowledge Challenge* → answer & submit → check the leaderboard → open **My History**. Then login as `vip@example.com` for the VIP contest. For admin APIs (create/finalize) use the Postman collection below with the live URL as `baseUrl`.

## Features

- **Role-based access** — `ADMIN` and `VIP` see all contests, `USER` (signed-in) sees normal contests only, guests can *view* everything but cannot participate.
- **Question types** — single-select, multi-select (exact match, no partial credit), true/false, each with configurable points.
- **Scoring** — correct answers add points; incorrect answers have no effect (no negative marking).
- **Leaderboard** — ranked by score, ties broken by earlier submission. Public.
- **Prizes** — admin finalizes an ended contest; the top scorer is awarded the prize automatically.
- **User history** — completed contests with scores, in-progress (joined but not submitted) contests, and all prizes won.
- **Auth** — JWT via httpOnly cookie (browser) **or** `Authorization: Bearer <token>` header (Postman/API clients). Passwords hashed with bcrypt.
- **Rate limiting** — sliding-window limiter per user/IP (auth: 10/min, reads: 60/min, writes: 20/min). Returns `429` with a retry hint.
- **Error handling** — consistent `{ success, error: { code, message } }` envelope; Zod validation errors include per-field details.
- **Performance** — indexed queries (leaderboard, history), `select`-only projections, singleton Prisma client, transactional submit/finalize.

## Setup

### 1. Prerequisites

- Node.js 20.9+
- A PostgreSQL database — local, or free tier from [Neon](https://neon.tech) / [Supabase](https://supabase.com)

### 2. Install

```bash
git clone <repo-url>
cd contest-system
npm install
```

### 3. Environment

Copy `.env.example` to `.env` and fill in:

```env
DATABASE_URL="postgresql://user:pass@host:5432/contest_system"
JWT_SECRET="a-long-random-secret"
NEXT_PUBLIC_GITHUB_URL="https://github.com/your-username/contest-system"
NEXT_PUBLIC_CONTACT_EMAIL="you@example.com"
```

### 4. Database schema + seed data

```bash
npm run db:deploy   # applies prisma/migrations (SQL migration scripts)
npm run db:seed     # demo users + contests
```

The raw SQL schema is in [`prisma/migrations/0001_init/migration.sql`](prisma/migrations/0001_init/migration.sql) if you prefer applying it manually (`psql -f`).

### 5. Run

```bash
npm run dev     # http://localhost:3000
```

### Seeded accounts

| Role  | Email               | Password      |
| ----- | ------------------- | ------------- |
| ADMIN | `admin@example.com` | `password123` |
| VIP   | `vip@example.com`   | `password123` |
| USER  | `user@example.com`  | `password123` |
| USER  | `sana@example.com`  | `password123` |

## Deploy to Vercel

1. Push the repo to GitHub and import it in Vercel.
2. Add env vars in Vercel → Project → Settings → Environment Variables: `DATABASE_URL`, `JWT_SECRET`, `NEXT_PUBLIC_GITHUB_URL`, `NEXT_PUBLIC_CONTACT_EMAIL`.
3. Deploy. Run migrations + seed against the production DB once from your machine:
   ```bash
   npm run db:deploy && npm run db:seed
   ```
   (with `DATABASE_URL` in `.env` pointing at the production database)

## API Documentation

All responses use a consistent envelope:

```jsonc
// success
{ "success": true, "data": { ... } }
// error
{ "success": false, "error": { "code": "FORBIDDEN", "message": "..." } }
```

**Authentication:** log in via browser (cookie is set automatically) or grab `data.token` from the login/signup response and send `Authorization: Bearer <token>`.

### Auth

| Method | Endpoint           | Access | Description |
| ------ | ------------------ | ------ | ----------- |
| POST   | `/api/auth/signup` | Public | Create account (role is always `USER`) |
| POST   | `/api/auth/login`  | Public | Login, returns `{ user, token }` + sets cookie |
| POST   | `/api/auth/logout` | Public | Clears the auth cookie |
| GET    | `/api/auth/me`     | Public | Current user, or `role: "GUEST"` |

<details>
<summary>POST /api/auth/signup — body</summary>

```json
{ "name": "Ali", "email": "ali@example.com", "password": "secret123" }
```
</details>

<details>
<summary>POST /api/auth/login — body</summary>

```json
{ "email": "user@example.com", "password": "password123" }
```
</details>

### Contests

| Method | Endpoint                          | Access | Description |
| ------ | --------------------------------- | ------ | ----------- |
| GET    | `/api/contests`                   | Public (guests can view) | List contests with `status` + `canParticipate` flags |
| POST   | `/api/contests`                   | ADMIN  | Create contest with questions |
| GET    | `/api/contests/:id`               | Public | Details; questions included only after joining (correct answers never exposed) |
| POST   | `/api/contests/:id/join`          | USER/VIP/ADMIN | Join → `IN_PROGRESS` participation. VIP contests reject normal users (403) |
| POST   | `/api/contests/:id/submit`        | USER/VIP/ADMIN | Submit answers once; returns score |
| GET    | `/api/contests/:id/leaderboard`   | Public | Ranked results (`?limit=50`, max 100) |
| POST   | `/api/contests/:id/finalize`      | ADMIN  | After end time: award prize to top scorer |

<details>
<summary>POST /api/contests — body (ADMIN)</summary>

```json
{
  "name": "Weekly Quiz",
  "description": "Test your knowledge",
  "accessLevel": "NORMAL",
  "startTime": "2026-07-01T00:00:00Z",
  "endTime": "2026-07-31T23:59:59Z",
  "prize": "Rs. 10,000",
  "questions": [
    {
      "text": "Capital of France?",
      "type": "SINGLE_SELECT",
      "points": 2,
      "options": [
        { "text": "Paris", "isCorrect": true },
        { "text": "Berlin", "isCorrect": false }
      ]
    },
    {
      "text": "Select prime numbers",
      "type": "MULTI_SELECT",
      "points": 3,
      "options": [
        { "text": "2", "isCorrect": true },
        { "text": "3", "isCorrect": true },
        { "text": "4", "isCorrect": false }
      ]
    },
    {
      "text": "The earth is flat.",
      "type": "TRUE_FALSE",
      "points": 1,
      "options": [
        { "text": "True", "isCorrect": false },
        { "text": "False", "isCorrect": true }
      ]
    }
  ]
}
```
</details>

<details>
<summary>POST /api/contests/:id/submit — body</summary>

```json
{
  "answers": [
    { "questionId": "<qid>", "selectedOptionIds": ["<optId>"] },
    { "questionId": "<qid2>", "selectedOptionIds": ["<optA>", "<optB>"] }
  ]
}
```

Response:

```json
{
  "success": true,
  "data": { "score": 5, "totalPoints": 8, "correctAnswers": 2, "totalQuestions": 4 }
}
```
</details>

### User history

| Method | Endpoint              | Access    | Description |
| ------ | --------------------- | --------- | ----------- |
| GET    | `/api/me/history`     | Signed-in | Completed contests with scores + prizes won |
| GET    | `/api/me/in-progress` | Signed-in | Joined but not yet submitted |
| GET    | `/api/me/prizes`      | Signed-in | All prizes won |

### Error codes

| HTTP | Code               | When |
| ---- | ------------------ | ---- |
| 400  | `BAD_REQUEST` / `VALIDATION_ERROR` / `BAD_JSON` | invalid input, contest not started/ended, not joined |
| 401  | `UNAUTHORIZED`     | guest hitting a protected endpoint, bad credentials |
| 403  | `FORBIDDEN`        | normal user on a VIP contest, non-admin creating contests |
| 404  | `NOT_FOUND`        | unknown contest |
| 409  | `CONFLICT`         | duplicate email, double submit, already finalized |
| 429  | `RATE_LIMITED`     | rate limit exceeded (includes retry hint) |
| 500  | `INTERNAL_ERROR`   | unexpected server error |

## Postman

Import [`postman/contest-system.postman_collection.json`](postman/contest-system.postman_collection.json). It includes every endpoint with working examples:

- Set the `baseUrl` collection variable (default `http://localhost:3000`).
- Run **Login** requests first — tokens are captured into collection variables automatically (`adminToken`, `vipToken`, `userToken`) and used by the other requests.

## Database schema

Prisma schema: [`prisma/schema.prisma`](prisma/schema.prisma) · SQL: [`prisma/migrations/0001_init/migration.sql`](prisma/migrations/0001_init/migration.sql)

```
User ──< Participation >── Contest ──< Question ──< Option
User ──< Prize >── Contest          Participation ──< Answer >── Question
```

- `Participation` is unique per `(userId, contestId)` — one attempt per contest.
- Leaderboard reads hit the `(contestId, status, score)` index.
- `Answer.selectedOptionIds` stores the selected option ids (JSON) with a graded `isCorrect` flag.

## Notes & trade-offs

- **Rate limiter** is in-memory (per serverless instance). For multi-instance production, swap the store for Redis/Upstash — call sites are unchanged.
- **Roles** are elevated by an admin (or directly in DB) — signup never grants VIP/ADMIN.
- **Prize awarding** is explicit (`finalize`) so results are auditable; it's idempotent (409 on re-run).
