# BookLeaf Author Support & Communication Portal

A support portal for BookLeaf Publishing with two sides:

- **Author portal:** authors see their books and royalties, raise support queries (with optional attachments), and get the team's replies live, with no refresh.
- **Admin support desk:** the team works from one prioritised queue. AI classifies and prioritises every ticket and drafts a reply grounded in the BookLeaf Knowledge Base, which the admin reviews and edits before sending.

**Stack:** React 19 + Vite · Node 22 + Express 5 · MongoDB (Mongoose) · Zod · JWT + bcrypt · Multer · Server-Sent Events · Google Gemini

API reference: [docs/API.md](docs/API.md)

---

## Quick start

Prerequisites: Node 22+, MongoDB running locally (or a MongoDB Atlas URI), and a Gemini API key. Without a key the app still works: classification falls back to keyword rules, and the admin writes replies by hand.

```bash
# 1. Backend
cd backend
npm install
cp .env.example .env        # then set JWT_SECRET and GEMINI_API_KEY
npm run seed                # loads the 10 authors, 18 books and 2 admins
npm run dev                 # http://localhost:4000

# 2. Frontend (new terminal)
cd frontend
npm install
cp .env.example .env        # VITE_API_URL=http://localhost:4000
npm run dev                 # http://localhost:5173
```

### Demo accounts

| Role | Email | Password |
|---|---|---|
| Author | `sneha.kulkarni@email.com` (any author email from the sample data works) | `author123` |
| Admin | `admin@bookleaf.com` | `admin123` |
| Admin | `ops@bookleaf.com` | `admin123` |

The login pages have a **Use demo account** button. Sessions are stored per browser tab, so you can be signed in as an author in one tab and as an admin in another and watch replies arrive live.

### Environment variables (`backend/.env`)

| Variable | Purpose |
|---|---|
| `PORT` | API port (default `4000`) |
| `CORS_ORIGIN` | Comma-separated frontend URL(s) allowed to call the API; empty allows any (local dev) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Token signing secret and lifetime (e.g. `1d`) |
| `GEMINI_API_KEY` | Google Gemini key. Leave empty to use the fallback classification |
| `GEMINI_MODEL` | Main model (default `gemini-3.5-flash`) |
| `GEMINI_FALLBACK_MODELS` | Comma-separated models to try when the main one is overloaded (default `gemini-flash-lite-latest`) |
| `SEED_AUTHOR_PASSWORD`, `SEED_ADMIN_PASSWORD` | Passwords `npm run seed` gives the demo accounts |

Keys and secrets live only in `.env`, which is gitignored. The frontend never sees the Gemini key.

---

## Deployment (Render + MongoDB Atlas)

`render.yaml` is a Render Blueprint that creates both services: `bookleaf-api` (Node web service) and `bookleaf-web` (static site with an SPA rewrite).

1. **Database:** create a free M0 cluster on MongoDB Atlas, add a database user, and under *Network Access* allow `0.0.0.0/0` (Render's free tier has no fixed IP). Copy the connection string and add the database name: `mongodb+srv://USER:PASS@cluster.xxxxx.mongodb.net/bookleaf`.
2. **Seed it once from your machine:** `cd backend && MONGODB_URI="<atlas uri>" npm run seed`
3. **Render:** *New → Blueprint*, connect this GitHub repo, and fill in the values it asks for:
   - `MONGODB_URI`: the Atlas URI
   - `GEMINI_API_KEY`: your Gemini key
   - `CORS_ORIGIN`: `https://bookleaf-web.onrender.com` (the frontend's URL)
   - `VITE_API_URL`: `https://bookleaf-api.onrender.com` (the API's URL)

   `JWT_SECRET` is generated automatically. If Render gives a service a different URL, update `CORS_ORIGIN` / `VITE_API_URL` to match and redeploy (the frontend reads `VITE_API_URL` at build time).
4. **Check it:** open `https://bookleaf-api.onrender.com/api/health`, then log in on the frontend with the demo accounts.

Notes on the free tier:
- The API sleeps after 15 minutes idle, so the first request takes about 30–50 s.
- The disk is wiped on every redeploy, so uploaded attachments don't survive one (production would use S3; see below).
- Live updates work as-is on a single instance.

---

## Features

### Author portal
- **My Books:** for every title, its ISBN, genre, publication date, status, MRP and copies sold, plus royalty earned, paid and pending. Books still in production say so instead of showing empty figures.
- **Raise a query:** pick a book or *General / Account Level*, then add a subject, a description, and up to 3 optional attachments (JPG, PNG, WEBP or PDF, 2 MB each).
- **My Tickets:** every ticket with its status and full conversation. When an admin replies, the ticket updates in place and a notification appears.

### Admin support desk
- **Ticket queue:** sorted by priority, then oldest first. Filter by status, category, priority, assignee and date range. Counts of pending tickets by priority, unassigned tickets, and an overdue flag based on how long each priority should wait.
- **AI classification:** every ticket gets one of the 6 categories and a priority when it is created, with a one-line reason. Admins can override both, and the override is recorded.
- **AI-drafted reply:** "Generate AI draft" writes a personalised reply from the ticket, the author's real book and royalty data, and the matching Knowledge Base section. The admin edits it before sending.
- **Internal notes:** visible to staff only.
- **Assign to me / unassign.**
- **Live queue:** new tickets and other admins' changes appear without a refresh.

### Ticket status
Status is never set by hand:

| Event | Status |
|---|---|
| Author raises a query | `Pending` |
| An admin sends a reply | `Answered` |

> **Deviation from the brief:** the brief lists Open / In Progress / Resolved / Closed. A ticket here can only be waiting on the team or answered, so two statuses that change automatically keep the queue accurate without admins having to update anything. "In progress" is covered by the assignee field, and the default *Pending* filter is the team's to-do list.

---

## Architecture

```
backend/src
├── config/        db connection, Knowledge Base (split by category)
├── models/        Admin, Author, Book, Ticket
├── middleware/    authenticate (JWT), authorize(...roles), uploadAttachments (multer)
├── controllers/   one per area: validate (Zod) → try { DB / action } catch → response
├── routes/        auth, authors, tickets, admin, events
├── services/      ai.service (Gemini), sse.service (live connections)
└── scripts/seed.js

frontend/src
├── api/           fetch client + one module per backend area
├── context/       AuthProvider (token in sessionStorage, auto-logout on 401 or expiry)
├── routes/        RequireRole, RedirectIfAuthenticated
├── hooks/         useAsync, useEventStream (SSE), useAuth
├── layouts/       PortalLayout (shared shell)
├── components/    ui/ (badges, feedback, logo) · tickets/ (thread, attachments)
└── pages/         Landing · auth/ · author/ · admin/
```

**Data model:** four collections. `authors` and `admins` store bcrypt password hashes, which are never returned by default. Each document in `books` points to its author. Each `tickets` document holds its own conversation, internal notes (hidden unless explicitly requested), the AI classification and the last AI draft. A numeric `priorityRank` plus a compound index keeps the queue sort cheap.

**Security and access control**
- **Auth:** bcrypt password hashes and JWTs carrying `{ id, role }`.
- **Roles:** `authorize()` checks the role on every route. Authors can reach only their own books, tickets and attachments; admins can reach everything.
- **Validation:** every body, query and route parameter goes through Zod.
- **Uploads:** checked for file type and size, saved under random names, and served only after an ownership check. File names are validated so `../` paths can't escape the upload folder.

**Real-time updates (SSE):** replies only flow from the server to the author, so Server-Sent Events are enough and WebSockets aren't needed. `GET /api/events` keeps each open tab's connection in an in-memory `Map` keyed by author ID. When an admin replies, the server looks up that author's connections and pushes the updated ticket. Browsers reconnect on their own and refetch on reconnect, so a server restart loses nothing. The in-memory map does limit the backend to one instance; see [Production considerations](#production-considerations) for scaling out with Redis.

---

## AI integration

**Model choice: Google Gemini (`gemini-3.5-flash`)**
- Both AI tasks are short and well defined: classification with structured output, and a reply draft of about 200 words. A fast "flash" model handles them well, at a fraction of the cost and latency of a frontier model.
- Native JSON-schema output (`responseJsonSchema`) makes classification reliable. The result is still re-validated with Zod before it reaches the database.
- It has a free tier, which suits a demo.

**Prompting**
- **Classification:** the system prompt defines the 6 categories and the priority rules, taken from the brief and the Knowledge Base (for example, a royalty more than 45 days past quarter end is High; ISBN errors are Critical). The model receives the ticket plus four book facts: title, status, pending royalty and last payout date.
- **Drafts:** the system prompt contains the company overview, the 6 tone guidelines, and only the policy and example reply for this ticket's category. The draft greets the author by name, acknowledges the issue, reassures them the team is on it, uses their real figures, and gives a timeline and next step. An explicit rule forbids inventing progress, causes or dates.

**Cost awareness**
- **Classification:** one call per ticket, with a small input and `maxOutputTokens` capped.
- **Drafts:** generated only when an admin clicks the button, never automatically. Each prompt carries one Knowledge Base section rather than the whole thing, and the draft is saved so reopening a ticket doesn't regenerate it.

**Graceful degradation**
- **Retries:** overloaded (503), rate-limited (429) and timed-out calls are retried with backoff, and then the fallback model is tried.
- **Classification:** if the AI still fails, keyword rules classify the ticket (`classificationSource: "fallback"`), so ticket creation never fails because of the AI.
- **Drafts:** if the AI still fails, the endpoint returns 503 and the admin writes the reply by hand in the same editor.
- **No key configured:** both paths degrade the same way.

---

## Production considerations

### Redis for real-time connections across servers

Today, each author's open SSE connections (the Express `res` objects) are kept in a `Map` in the Node process's memory. That works because there is only one server: the admin's reply and the author's connection are always handled by the same process.

In production the backend runs on several instances behind a load balancer. The author's connection might be held by server A while the admin's reply lands on server B. Server B has no `res` for that author, so the live update would be lost.

**The fix is Redis.** One detail matters: a `res` object is a live network connection, so it can't be stored in Redis or any database. Each server keeps the `res` objects for its own connections in memory, as now. Redis records which author is connected and passes events between the servers:

1. **Connection registry:** when an author connects, the server records `authorId → serverId` in Redis (e.g. a Redis set per author) and removes the entry when they disconnect. Any instance can then check whether, and where, an author is online.
2. **Pub/Sub for delivery:** when an admin replies, the server handling the reply publishes `{ authorId, event, ticket }` to a Redis channel. Every instance subscribes to that channel. Each one checks its own local `Map` and writes to the author's `res` if it holds that connection.

This also survives a single server restarting: the author's browser reconnects to any healthy instance, registers again, and refetches anything it missed. The code change is contained in `services/sse.service.js`: `notifyAuthor` / `notifyAdmins` publish to Redis instead of writing directly, and a subscriber writes to the local connections.

### Background job for an instant AI draft

Right now the AI draft is generated **on demand**: when the admin clicks *Generate AI draft*, the request waits on Gemini, which takes about 5–15 s and longer when the model is overloaded and retries kick in. This keeps cost down, because drafts are only generated for tickets an admin actually works on.

If drafts should be **ready the moment an admin opens a ticket**, generate them in a background job:

1. When a ticket is created, save it and respond to the author straight away, then put a `generate-draft` job on a queue (e.g. **BullMQ on Redis**).
2. A separate worker process takes the job, calls Gemini with the same prompt as today, and saves the result to `ticket.aiDraft`.
3. The worker sends a `ticket:changed` event so an admin viewing the ticket sees the draft appear. The *Generate AI draft* button stays available for regenerating it.

The queue also deals with AI unavailability for you: failed jobs retry with backoff, and the author's request never waits on the AI. The trade-off is cost, because every ticket gets a draft, including ones resolved without it. A middle ground is to pre-generate drafts only for **Critical and High** priority tickets and keep the on-demand button for the rest.

Ticket **classification** could move to the same queue. It currently runs inline because the queue needs the priority immediately, and the keyword fallback already guarantees ticket creation never fails.

---

## Known limitations / next steps
- Authors can't reply within a ticket; a follow-up means raising a new ticket.
- Live connections are tracked in one server's memory and uploads are saved to its disk. For production, use Redis (see above) and object storage such as S3.
- AI drafts are generated on demand rather than in a background job (see above).
- No rate limiting on login and no refresh tokens yet.
- No automated test suite; the flows were tested end to end against the running API and in the browser.
