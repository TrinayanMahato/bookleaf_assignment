import { unlink } from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import { z } from 'zod';
import Book from '../models/Book.js';
import Ticket from '../models/Ticket.js';
import { classifyTicket } from '../services/ai.service.js';
import { notifyAdmins } from '../services/sse.service.js';

const createTicketSchema = z.object({
  // "general" means the query is about the account, not a specific book.
  bookId: z.string({ error: 'Select a book or General / Account Level' }).trim().min(1),
  subject: z
    .string({ error: 'Subject is required' })
    .trim()
    .min(5, 'Subject must be at least 5 characters')
    .max(200, 'Subject must be at most 200 characters'),
  description: z
    .string({ error: 'Description is required' })
    .trim()
    .min(20, 'Please describe the issue in at least 20 characters')
    .max(5000, 'Description must be at most 5000 characters'),
});

// Multer has already written the files to disk, so remove them if the ticket is rejected.
const removeUploads = (files = []) => Promise.all(files.map((f) => unlink(f.path).catch(() => {})));

// POST /api/tickets  (multipart/form-data)
export const createTicket = async (req, res) => {
  const parsed = createTicketSchema.safeParse(req.body);
  if (!parsed.success) {
    await removeUploads(req.files);
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
  }

  try {
    const { bookId, subject, description } = parsed.data;

    let book = null;
    if (bookId !== 'general') {
      // Only the logged-in author's own books can be attached to a ticket.
      book = await Book.findOne({ bookId, author: req.user.id });
      if (!book) {
        await removeUploads(req.files);
        return res.status(404).json({ error: 'Book not found in your account' });
      }
    }

    const attachments = (req.files || []).map((f) => ({
      originalName: f.originalname,
      filename: f.filename,
      mimetype: f.mimetype,
      size: f.size,
    }));

    // Never throws: falls back to keyword rules if the AI is down, so the ticket is always created.
    const classification = await classifyTicket({ subject, description, book });

    const ticket = await Ticket.create({
      author: req.user.id,
      book: book?._id ?? null,
      subject,
      description,
      attachments,
      category: classification.category,
      priority: classification.priority,
      classificationSource: classification.source,
      classificationReason: classification.reason,
    });

    notifyAdmins('ticket:created', { ticketId: ticket._id });

    return res.status(201).json({ ticket });
  } catch (err) {
    console.error('Creating ticket failed:', err);
    await removeUploads(req.files);
    return res.status(500).json({ error: 'Could not create ticket, please try again' });
  }
};

const attachmentParamsSchema = z.object({
  id: z.string().refine((v) => mongoose.isValidObjectId(v), 'id must be a valid ticket id'),
  filename: z.string().regex(/^[\w-]+\.[a-z0-9]+$/i, 'Invalid file name'), // blocks ../ path tricks
});

// GET /api/tickets/:id/attachments/:filename
export const getAttachment = async (req, res) => {
  const parsed = attachmentParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
  }

  try {
    const ticket = await Ticket.findById(parsed.data.id).select('author attachments');
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    // Authors may only open files on their own tickets; admins may open any.
    if (req.user.role === 'author' && String(ticket.author) !== req.user.id) {
      return res.status(403).json({ error: 'You do not have access to this file' });
    }

    const attachment = ticket.attachments.find((a) => a.filename === parsed.data.filename);
    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    res.type(attachment.mimetype);
    return res.sendFile(path.resolve('uploads', attachment.filename), (err) => {
      if (err && !res.headersSent) res.status(404).json({ error: 'File is no longer available' });
    });
  } catch (err) {
    console.error('Fetching attachment failed:', err);
    return res.status(500).json({ error: 'Could not load attachment' });
  }
};
