import mongoose from 'mongoose';
import { z } from 'zod';
import Ticket, { STATUSES, ACTIVE_STATUSES, CATEGORIES, PRIORITIES } from '../models/Ticket.js';
import { generateDraft, AIUnavailableError } from '../services/ai.service.js';
import { notifyAuthor, notifyAdmins } from '../services/sse.service.js';

const ticketIdSchema = z.object({
  id: z.string().refine((v) => mongoose.isValidObjectId(v), 'id must be a valid ticket id'),
});

const replySchema = z.object({
  body: z
    .string({ error: 'Reply body is required' })
    .trim()
    .min(1, 'Reply body is required')
    .max(5000, 'Reply must be at most 5000 characters'),
  aiDrafted: z.boolean().optional(), // reply started from the AI draft
});

// "Royalty & Payments,General Inquiry" → array, each checked against the allowed values.
const csvEnum = (values) =>
  z
    .string()
    .transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean))
    .pipe(z.array(z.enum(values)))
    .optional();

const queueQuerySchema = z.object({
  status: csvEnum(STATUSES),
  category: csvEnum(CATEGORIES),
  priority: csvEnum(PRIORITIES),
  assigned: z.enum(['me', 'unassigned']).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const updateTicketSchema = z
  .object({
    status: z.enum(STATUSES).optional(),
    category: z.enum(CATEGORIES).optional(),
    priority: z.enum(PRIORITIES).optional(),
    assignedTo: z.enum(['me']).nullable().optional(), // "me" assigns to the caller, null unassigns
  })
  .strict('Only status, category, priority and assignedTo can be changed')
  .refine((v) => Object.keys(v).length > 0, 'Provide at least one field to update');

const noteSchema = z.object({
  body: z.string({ error: 'Note is required' }).trim().min(1, 'Note is required').max(2000, 'Note must be at most 2000 characters'),
});

const withTicketRelations = (query) =>
  query
    .populate('author', 'authorId name email city')
    .populate('book')
    .populate('assignedTo', 'name')
    .populate('messages.sender', 'name');

// Same shape the author's My Tickets endpoint returns, without admin-only fields.
const findAuthorView = (id) =>
  Ticket.findById(id).select('-aiDraft').populate('book', 'bookId title').populate('messages.sender', 'name');

// GET /api/admin/tickets
export const listTickets = async (req, res) => {
  const parsed = queueQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
  }

  try {
    const { status, category, priority, assigned, from, to, page, limit } = parsed.data;

    const filter = {};
    if (status) filter.status = { $in: status };
    if (category) filter.category = { $in: category };
    if (priority) filter.priority = { $in: priority };
    if (assigned === 'me') filter.assignedTo = req.user.id;
    if (assigned === 'unassigned') filter.assignedTo = null;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = from;
      if (to) filter.createdAt.$lte = new Date(to.getTime() + 24 * 60 * 60 * 1000 - 1); // include the whole "to" day
    }

    // Most urgent first, then oldest first within each priority.
    const [tickets, total, priorityCounts, unassigned] = await Promise.all([
      Ticket.find(filter)
        .select('-aiDraft -messages -description')
        .populate('author', 'authorId name')
        .populate('book', 'bookId title')
        .populate('assignedTo', 'name')
        .sort({ priorityRank: 1, createdAt: 1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Ticket.countDocuments(filter),
      Ticket.aggregate([
        { $match: { status: { $in: ACTIVE_STATUSES } } },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),
      Ticket.countDocuments({ status: { $in: ACTIVE_STATUSES }, assignedTo: null }),
    ]);

    const counts = { unassigned, ...Object.fromEntries(PRIORITIES.map((p) => [p, 0])) };
    priorityCounts.forEach(({ _id, count }) => (counts[_id] = count));

    return res.status(200).json({ tickets, total, page, pages: Math.ceil(total / limit) || 1, counts });
  } catch (err) {
    console.error('Listing tickets failed:', err);
    return res.status(500).json({ error: 'Could not load tickets, please try again' });
  }
};

// GET /api/admin/tickets/:id
export const getTicket = async (req, res) => {
  const parsed = ticketIdSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
  }

  try {
    const ticket = await withTicketRelations(
      Ticket.findById(parsed.data.id).select('+internalNotes').populate('internalNotes.admin', 'name')
    );
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    return res.status(200).json({ ticket });
  } catch (err) {
    console.error('Fetching ticket failed:', err);
    return res.status(500).json({ error: 'Could not load ticket, please try again' });
  }
};

// PATCH /api/admin/tickets/:id
export const updateTicket = async (req, res) => {
  const params = ticketIdSchema.safeParse(req.params);
  const body = updateTicketSchema.safeParse(req.body);
  if (!params.success || !body.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: { ...params.error?.flatten().fieldErrors, ...body.error?.flatten() },
    });
  }

  try {
    const ticket = await Ticket.findById(params.data.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const { status, category, priority, assignedTo } = body.data;
    if (category) ticket.category = category;
    if (priority) ticket.priority = priority;
    // An admin override wins over the AI and is recorded as such.
    if (category || priority) {
      ticket.classificationSource = 'admin';
      ticket.classificationReason = 'Set manually by an admin';
    }
    if (assignedTo !== undefined) ticket.assignedTo = assignedTo === 'me' ? req.user.id : null;
    // Picking up an Open ticket starts work on it, unless the admin also chose a status in this request.
    if (status) ticket.status = status;
    else if (assignedTo === 'me' && ticket.status === 'Open') ticket.status = 'In Progress';
    const statusChanged = ticket.isModified('status');
    await ticket.save();

    notifyAdmins('ticket:changed', { ticketId: ticket._id });
    // The author sees status changes live, the same way they see replies.
    if (statusChanged) notifyAuthor(ticket.author, 'ticket:updated', await findAuthorView(ticket._id));

    const updated = await withTicketRelations(
      Ticket.findById(ticket._id).select('+internalNotes').populate('internalNotes.admin', 'name')
    );
    return res.status(200).json({ ticket: updated });
  } catch (err) {
    console.error('Updating ticket failed:', err);
    return res.status(500).json({ error: 'Could not update ticket, please try again' });
  }
};

// POST /api/admin/tickets/:id/notes
export const addNote = async (req, res) => {
  const params = ticketIdSchema.safeParse(req.params);
  const body = noteSchema.safeParse(req.body);
  if (!params.success || !body.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: { ...params.error?.flatten().fieldErrors, ...body.error?.flatten().fieldErrors },
    });
  }

  try {
    const ticket = await Ticket.findById(params.data.id).select('+internalNotes');
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    ticket.internalNotes.push({ admin: req.user.id, body: body.data.body });
    await ticket.save();
    await ticket.populate('internalNotes.admin', 'name');

    return res.status(201).json({ internalNotes: ticket.internalNotes });
  } catch (err) {
    console.error('Adding note failed:', err);
    return res.status(500).json({ error: 'Could not add note, please try again' });
  }
};

// POST /api/admin/tickets/:id/draft
export const generateTicketDraft = async (req, res) => {
  const parsed = ticketIdSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
  }

  try {
    // Content comes from the DB, never the client, so the AI only sees real ticket and book data.
    const ticket = await Ticket.findById(parsed.data.id).populate('book').populate('author', 'name');
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const body = await generateDraft({ ticket, book: ticket.book, author: ticket.author, adminId: req.user.id });

    ticket.aiDraft = { body, generatedAt: new Date() };
    await ticket.save();

    return res.status(200).json({ draft: ticket.aiDraft });
  } catch (err) {
    if (err instanceof AIUnavailableError) {
      return res.status(503).json({ error: 'AI draft unavailable, please write the reply manually' });
    }
    console.error('Generating draft failed:', err);
    return res.status(500).json({ error: 'Could not generate draft, please try again' });
  }
};

// POST /api/admin/tickets/:id/replies
export const sendReply = async (req, res) => {
  const params = ticketIdSchema.safeParse(req.params);
  const body = replySchema.safeParse(req.body);
  if (!params.success || !body.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: { ...params.error?.flatten().fieldErrors, ...body.error?.flatten().fieldErrors },
    });
  }

  try {
    const ticket = await Ticket.findById(params.data.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    ticket.messages.push({
      sender: req.user.id,
      senderModel: 'Admin',
      body: body.data.body,
      aiDrafted: body.data.aiDrafted ?? false,
    });
    ticket.status = 'Resolved'; // a reply resolves the ticket; an admin can reopen or close it from the status field
    await ticket.save();

    const authorView = await findAuthorView(ticket._id);

    // ticket.author is the author's id; notifyAuthor looks up their open SSE res objects.
    const delivered = notifyAuthor(ticket.author, 'ticket:updated', authorView);
    notifyAdmins('ticket:changed', { ticketId: ticket._id });

    return res.status(201).json({ ticket: authorView, delivered });
  } catch (err) {
    console.error('Sending reply failed:', err);
    return res.status(500).json({ error: 'Could not send reply, please try again' });
  }
};
