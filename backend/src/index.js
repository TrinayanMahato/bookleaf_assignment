import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import authorRoutes from './routes/author.routes.js';
import ticketRoutes from './routes/ticket.routes.js';
import eventsRoutes from './routes/events.routes.js';
import adminRoutes from './routes/admin.routes.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/authors', authorRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/admin', adminRoutes);

app.use('/api', (req, res) => res.status(404).json({ error: `No route for ${req.method} ${req.originalUrl}` }));

// Last-resort handler, e.g. malformed JSON bodies, so clients never get an HTML error page.
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Request body is not valid JSON' });
  console.error('Unhandled error:', err);
  return res.status(500).json({ error: 'Something went wrong, please try again' });
});

const PORT = process.env.PORT || 4000;

connectDB()
  .then(() => app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`)))
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });
