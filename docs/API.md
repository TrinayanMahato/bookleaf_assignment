# BookLeaf Support API

Base URL (local): `http://localhost:4000/api`

All request and response bodies are JSON unless stated otherwise. Every endpoint validates its input with Zod.

## Conventions

### Authentication

Log in with one of the `/auth/*/login` endpoints to get a JWT. Send it on every other request:

```
Authorization: Bearer <token>
```

The token payload is `{ id, role }`, where `role` is `author` or `admin`. Tokens expire after `JWT_EXPIRES_IN` (default `1d`).

The SSE endpoint is the one exception. `EventSource` can't set headers, so it takes the token as `?token=`.

### Roles

| Role | Can access |
|---|---|
| `author` | Their own books, their own tickets, creating tickets, attachments on their own tickets |
| `admin` | Every `/admin/*` endpoint, plus any author's books, tickets and attachments |

### Errors

Every error has the same shape:

```json
{ "error": "Validation failed", "details": { "subject": ["Subject must be at least 5 characters"] } }
```

`details` only appears on validation errors. It maps each field to its messages; errors that aren't about one field go under `formErrors`.

| Status | Meaning |
|---|---|
| 400 | Validation failed, malformed JSON, or a bad upload (wrong file type, over 2 MB, more than 3 files) |
| 401 | Missing, invalid or expired token, or wrong email/password |
| 403 | Logged in, but this role or user may not access the resource |
| 404 | Resource or route not found |
| 503 | The AI draft is unavailable (every retry and the fallback model failed) |
| 500 | Unexpected server error |

### Enums

| Field | Values |
|---|---|
| `status` | `Pending`, `Answered` (set automatically, never by hand) |
| `priority` | `Critical`, `High`, `Medium`, `Low` |
| `category` | `Royalty & Payments`, `ISBN & Metadata Issues`, `Printing & Quality`, `Distribution & Availability`, `Book Status & Production Updates`, `General Inquiry` |
| `classificationSource` | `ai`, `fallback` (keyword rules used because the AI was unavailable), `admin` (manual override) |

---

## Health

### `GET /health`

Public. Returns `200 { "status": "ok" }`.

---

## Auth

### `POST /auth/author/login`
### `POST /auth/admin/login`

Public.

```json
{ "email": "sneha.kulkarni@email.com", "password": "author123" }
```

Both fields are required, and `email` must be a valid email.

**200**

```json
{
  "token": "eyJhbGciOi...",
  "user": { "id": "665f...", "authorId": "AUTH007", "name": "Sneha Kulkarni", "email": "sneha.kulkarni@email.com", "role": "author" }
}
```

The admin login returns the same shape, without `authorId`. Wrong credentials return `401 { "error": "Invalid email or password" }`; the message doesn't say whether the email exists.

---

## Authors

### `GET /authors/:authorId/books`

Roles: `author` (own ID only, otherwise 403) and `admin`. `authorId` must look like `AUTH007`.

**200**

```json
{
  "authorId": "AUTH007",
  "count": 3,
  "books": [
    {
      "_id": "665f...", "bookId": "BK011", "title": "The Algorithm of Love", "isbn": "978-93-5XXXX-11-0",
      "genre": "Romance", "publicationDate": "2022-12-25T00:00:00.000Z", "status": "Published & Live",
      "mrp": 299, "authorRoyaltyPerCopy": 25, "totalCopiesSold": 1567,
      "totalRoyaltyEarned": 39175, "royaltyPaid": 35000, "royaltyPending": 4175,
      "lastRoyaltyPayoutDate": "2025-11-15T00:00:00.000Z", "printPartner": "Repro India", "availableOn": ["Amazon India", "Flipkart", "Amazon US", "BookLeaf Store"]
    }
  ]
}
```

Books still in production have `null` for `isbn`, `mrp` and `publicationDate`.

### `GET /authors/:authorId/tickets`

Same roles and validation. Returns the author's tickets, most recently updated first. Each ticket has its `book` (`bookId`, `title`) and its messages with the sender's `name` filled in. `internalNotes` and `aiDraft` are never included.

```json
{ "authorId": "AUTH007", "count": 1, "tickets": [ { "_id": "...", "subject": "...", "status": "Answered", "messages": [ ... ] } ] }
```

---

## Tickets (author)

### `POST /tickets`

Role: `author`. The body is **`multipart/form-data`**.

| Field | Rules |
|---|---|
| `bookId` | `general` (an account-level query) or one of the author's own book IDs (404 otherwise) |
| `subject` | 5–200 characters |
| `description` | 20–5000 characters |
| `attachments` | Optional. Up to 3 files of 2 MB or less each; JPEG, PNG, WEBP or PDF only |

Gemini classifies the ticket before it is saved, choosing a category and a priority (structured JSON output, re-checked with Zod). If the AI fails, keyword rules are used and `classificationSource` is `fallback`, so a ticket is always created. Every new ticket starts as `Pending`, and connected admins receive a `ticket:created` event.

**201** `{ "ticket": { ..., "status": "Pending", "category": "Royalty & Payments", "priority": "Critical", "classificationSource": "ai", "classificationReason": "..." } }`

If a request is rejected, any files already uploaded for it are deleted.

```bash
curl -H "Authorization: Bearer $TOKEN" \
  -F bookId=BK011 -F "subject=Royalty not received" \
  -F "description=My last quarter royalty has not reached my bank account yet." \
  -F attachments=@statement.pdf \
  http://localhost:4000/api/tickets
```

### `GET /tickets/:id/attachments/:filename`

Roles: `author` (own tickets only) and `admin`. Streams the file with its original MIME type. File names are validated, so paths like `../` are rejected.

---

## Admin

All endpoints below require the `admin` role.

### `GET /admin/tickets`

The ticket queue, sorted by priority (Critical first) and then oldest first.

| Query param | Example | Notes |
|---|---|---|
| `status` | `Pending` | Comma-separated list allowed |
| `category` | `Royalty & Payments,Printing & Quality` | Comma-separated list allowed |
| `priority` | `Critical,High` | Comma-separated list allowed |
| `assigned` | `me` or `unassigned` | |
| `from`, `to` | `2026-10-01` | Filters by creation date; `to` includes that whole day |
| `page`, `limit` | `1`, `20` | `limit` is capped at 100 |

**200**

```json
{
  "tickets": [ { "_id": "...", "subject": "...", "priority": "Critical", "category": "...", "status": "Pending",
                 "author": { "authorId": "AUTH001", "name": "Priya Sharma" }, "book": { "bookId": "BK001", "title": "..." },
                 "assignedTo": null, "createdAt": "..." } ],
  "total": 6, "page": 1, "pages": 1,
  "counts": { "unassigned": 6, "Critical": 2, "High": 2, "Medium": 1, "Low": 1 }
}
```

`counts` always covers every pending ticket, whatever filters are applied, so the dashboard numbers stay steady. Queue rows leave out `description`, `messages` and `aiDraft` to keep the response small.

### `GET /admin/tickets/:id`

The full ticket, including author details (`authorId`, `name`, `email`, `city`), every book field, the assignee, messages, `internalNotes` with each admin's name, and the last `aiDraft`.

### `PATCH /admin/tickets/:id`

Overrides the AI's classification and/or changes the assignee. Send at least one of these fields; any other field is rejected with 400, `status` included.

```json
{ "priority": "High", "category": "Printing & Quality", "assignedTo": "me" }
```

`assignedTo: "me"` assigns the ticket to the caller, and `null` unassigns it. Changing the category or priority sets `classificationSource` to `admin`. Returns `200 { "ticket": ... }` and sends a `ticket:changed` event to admins.

### `POST /admin/tickets/:id/notes`

```json
{ "body": "Checked with finance, payout batch failed" }
```

1–2000 characters. Authors never see notes. Returns `201 { "internalNotes": [ ... ] }`.

### `POST /admin/tickets/:id/draft`

Generates a reply draft with Gemini. It runs only when an admin asks for it, and takes no body: the ticket, book and author data are loaded from the database, never sent by the client. The prompt carries the BookLeaf tone guidelines plus the Knowledge Base section for this ticket's category. The draft is saved on the ticket.

**200** `{ "draft": { "body": "Dear Sneha, ...", "generatedAt": "..." } }`

**503** `{ "error": "AI draft unavailable, please write the reply manually" }`. This is returned only after retries with backoff and the fallback model have all failed.

### `POST /admin/tickets/:id/replies`

```json
{ "body": "Dear Sneha, ...", "aiDrafted": true }
```

`body` is 1–5000 characters; `aiDrafted` is optional and records whether the reply started from the AI draft. Adds the message, sets the status to **Answered**, and pushes the updated ticket to every open tab of that author.

**201** `{ "ticket": { ... }, "delivered": 1 }`, where `delivered` is the number of the author's tabs that received it live (0 means they'll see it when they next load their tickets).

---

## Real-time events (SSE)

### `GET /events?token=<jwt>`

A long-lived `text/event-stream` connection for authors and admins. The server tells the browser to reconnect after 3 s if the connection drops (`retry: 3000`) and sends a `: ping` comment every 25 s so proxies keep it open.

| Event | Sent to | Data |
|---|---|---|
| `connected` | Whoever just connected | `{ "role": "author" }` |
| `ticket:updated` | Every open tab of the ticket's author | The ticket in the same shape as `GET /authors/:id/tickets` |
| `ticket:created` | All admins | `{ "ticketId": "..." }` |
| `ticket:changed` | All admins | `{ "ticketId": "..." }` (after a reply, override or assignment) |

Connections are held in memory: a `Map` from author ID to that author's open response streams, plus a `Set` for admins. After a server restart, browsers reconnect on their own and refetch, so nothing is lost. To run several server instances, this would need a shared pub/sub such as Redis.

```js
const source = new EventSource(`${API_URL}/api/events?token=${token}`);
source.addEventListener('ticket:updated', (e) => console.log(JSON.parse(e.data)));
```
