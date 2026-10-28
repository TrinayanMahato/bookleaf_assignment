# BookLeaf Author Support Portal: Write-up

**Live:** https://bookleaf-web-r33q.onrender.com · **API:** https://bookleaf-api-9ubd.onrender.com · **Stack:** React 19 + Vite, Node/Express 5, MongoDB, Zod, JWT + bcrypt, SSE, Google Gemini

**Setup** and the full **assumptions list** are in the README ([Quick start](../README.md#quick-start), [Assumptions & notes](../README.md#assumptions--notes)). Demo logins: author `sneha.kulkarni@email.com` / `author123`, admin `admin@bookleaf.com` / `admin123`.

## What I built
Two portals on one API:
- **Authors** see their books and royalties (earned / paid / pending), raise a query about a specific book or their account, with optional attachments, and see the team's replies arrive live.
- **Admins** work a single queue sorted by priority and then age, with filters, per-priority counts and overdue flags. They can override the AI's category and priority, keep internal notes, assign tickets, and generate an AI-drafted reply to edit before sending.

## Key decisions

**Structure and security.** The backend follows models → routes → controllers. Every controller does the same three things: validate the input with Zod, run the database work in a `try/catch`, and return a consistent JSON response.
- Passwords are hashed with bcrypt. JWTs carry `{ id, role }`, and an `authorize(...roles)` middleware enforces access on every route.
- Authors can reach only their own books, tickets and attachments. Internal notes are excluded at the schema level, so they can't leak into an author response.
- Uploads are limited by type and size (2 MB), saved under random names, and served only after an ownership check.

**Real-time with Server-Sent Events, not WebSockets.** Updates only flow from the server to the author, so SSE is the simpler and correct tool. Each open tab's response stream is held in an in-memory `Map` keyed by author ID. When an admin replies, the server looks up that author's streams and pushes the updated ticket. Browsers reconnect on their own and refetch on reconnect, so a restart loses nothing.

**Two automatic statuses instead of four.** The brief lists Open / In Progress / Resolved / Closed. I use **Pending** (set when an author raises a query) and **Answered** (set automatically when an admin replies). A ticket is really either waiting on the team or not, so letting the system set the status keeps the queue accurate without admins updating it by hand. "In progress" is covered by assignment.

## AI integration
- **Model:** Gemini 3.5 Flash. Both tasks are short and well defined, so a fast, low-cost model fits. Its native JSON-schema output makes classification reliable.
- **Classification at creation:** structured output returns `{ category, priority, reason }`, which is re-validated with Zod. The prompt encodes the 6 categories and BookLeaf's urgency rules, for example ISBN errors are Critical and royalties past the 45-day window are High. Only four book facts are sent.
- **Reply drafts on demand:** a draft is generated only when the admin asks. The prompt includes the 6 tone guidelines and *only* the Knowledge Base section for that ticket's category, plus the author's real book and royalty data. An explicit rule forbids inventing progress, causes or dates. The draft is saved so it isn't regenerated.
- **Graceful degradation:**
  - Overloaded or rate-limited calls are retried with backoff, then a fallback model is tried.
  - If the AI still fails, classification falls back to keyword rules, so ticket creation never fails.
  - The draft endpoint returns 503 and the admin writes the reply manually.
- **Cost:** one small classification call per ticket, drafts only when requested, and a single Knowledge Base section per prompt. The API key exists only in server environment variables.

## Trade-offs and what I'd do next
- **Scaling SSE:** a `res` object is a live connection, so it can't be stored in Redis. Across multiple instances I'd keep connections local and use **Redis Pub/Sub**: the instance that receives the reply publishes it, and the instance holding the author's connection delivers it.
- **Instant drafts:** generate them in a **background job queue (BullMQ)** when a ticket is created, perhaps only for Critical and High tickets to control cost.
- **Other improvements:**
  - follow-up replies from authors within a ticket
  - storing attachments in S3 (the free host's disk is wiped on each redeploy)
  - rate limiting on login
  - an automated test suite (the flows were verified end to end against the running API and in the browser)
