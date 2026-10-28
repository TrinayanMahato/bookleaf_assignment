import { z } from 'zod';
import Author from '../models/Author.js';
import Book from '../models/Book.js';
import Ticket from '../models/Ticket.js';

const authorIdSchema = z.object({
  authorId: z.string().trim().regex(/^AUTH\d+$/, 'authorId must look like AUTH001'),
});

// GET /api/authors/:authorId/books
export const getAuthorBooks = async (req, res) => {
  const parsed = authorIdSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
  }

  try {
    const author = await Author.findOne({ authorId: parsed.data.authorId });
    if (!author) {
      return res.status(404).json({ error: 'Author not found' });
    }

    // Authors may only read their own books; admins may read anyone's.
    if (req.user.role === 'author' && String(author._id) !== req.user.id) {
      return res.status(403).json({ error: 'You can only view your own books' });
    }

    const books = await Book.find({ author: author._id }).sort({ publicationDate: -1 });
    return res.status(200).json({ authorId: author.authorId, count: books.length, books });
  } catch (err) {
    console.error('Fetching author books failed:', err);
    return res.status(500).json({ error: 'Could not fetch books, please try again' });
  }
};

// GET /api/authors/:authorId/tickets
export const getAuthorTickets = async (req, res) => {
  const parsed = authorIdSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
  }

  try {
    const author = await Author.findOne({ authorId: parsed.data.authorId });
    if (!author) {
      return res.status(404).json({ error: 'Author not found' });
    }

    if (req.user.role === 'author' && String(author._id) !== req.user.id) {
      return res.status(403).json({ error: 'You can only view your own tickets' });
    }

    // internalNotes is excluded by the schema; aiDraft is admin-only working data.
    const tickets = await Ticket.find({ author: author._id })
      .select('-aiDraft')
      .populate('book', 'bookId title')
      .populate('messages.sender', 'name')
      .sort({ updatedAt: -1 });

    return res.status(200).json({ authorId: author.authorId, count: tickets.length, tickets });
  } catch (err) {
    console.error('Fetching author tickets failed:', err);
    return res.status(500).json({ error: 'Could not fetch tickets, please try again' });
  }
};
