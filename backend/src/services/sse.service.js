// Open SSE connections live only in memory: a res can't outlive this process,
// and browsers' EventSource reconnects on its own after a restart.
const authorClients = new Map(); // authorId → Set<res> (one per open tab)
const adminClients = new Set(); // every open admin tab; admins all see the same queue

const HEARTBEAT_MS = 25_000; // keeps proxies (e.g. Render) from closing idle streams

export const addAuthorClient = (authorId, res) => {
  if (!authorClients.has(authorId)) authorClients.set(authorId, new Set());
  authorClients.get(authorId).add(res);
};

export const removeAuthorClient = (authorId, res) => {
  const clients = authorClients.get(authorId);
  if (!clients) return;
  clients.delete(res);
  if (clients.size === 0) authorClients.delete(authorId);
};

export const addAdminClient = (res) => adminClients.add(res);
export const removeAdminClient = (res) => adminClients.delete(res);

const send = (res, event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

// Pushes an event to every open tab of one author. Returns how many connections received it.
export const notifyAuthor = (authorId, event, data) => {
  const clients = authorClients.get(String(authorId));
  clients?.forEach((res) => send(res, event, data));
  return clients?.size ?? 0;
};

// Tells every open admin tab that the queue changed (new ticket, reply, status, overrides).
export const notifyAdmins = (event, data) => {
  adminClients.forEach((res) => send(res, event, data));
  return adminClients.size;
};

export const startHeartbeat = (res) => setInterval(() => res.write(': ping\n\n'), HEARTBEAT_MS);
