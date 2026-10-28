import jwt from 'jsonwebtoken';
import { z } from 'zod';
import {
  addAuthorClient,
  removeAuthorClient,
  addAdminClient,
  removeAdminClient,
  startHeartbeat,
} from '../services/sse.service.js';

// EventSource can't send an Authorization header, so the JWT comes in the query string.
const eventsQuerySchema = z.object({
  token: z.string({ error: 'token query parameter is required' }).min(1, 'token query parameter is required'),
});

// GET /api/events?token=<jwt>
export const subscribe = (req, res) => {
  const parsed = eventsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
  }

  try {
    let user;
    try {
      user = jwt.verify(parsed.data.token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    if (!['author', 'admin'].includes(user.role)) {
      return res.status(403).json({ error: 'You do not have access to ticket updates' });
    }

    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // stop nginx-style proxies buffering the stream
    });
    res.flushHeaders();
    res.write('retry: 3000\n\n'); // browser reconnect delay after a drop
    res.write(`event: connected\ndata: ${JSON.stringify({ role: user.role })}\n\n`);

    if (user.role === 'admin') addAdminClient(res);
    else addAuthorClient(user.id, res);
    const heartbeat = startHeartbeat(res);

    req.on('close', () => {
      clearInterval(heartbeat);
      if (user.role === 'admin') removeAdminClient(res);
      else removeAuthorClient(user.id, res);
    });
  } catch (err) {
    console.error('Opening event stream failed:', err);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Could not open event stream' });
    }
    res.end();
  }
};
