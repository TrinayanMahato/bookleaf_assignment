// Resets the database and loads the BookLeaf sample dataset.
// Run with: npm run seed
import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db.js';
import Author from '../models/Author.js';
import Admin from '../models/Admin.js';
import Book from '../models/Book.js';
import Ticket from '../models/Ticket.js';

const DATA_FILE = new URL('../../data/bookleaf_sample_data.json', import.meta.url);
const AUTHOR_PASSWORD = process.env.SEED_AUTHOR_PASSWORD || 'author123';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'admin123';

const toDate = (value) => (value ? new Date(value) : null);

async function seed() {
  await connectDB();
  const { authors } = JSON.parse(await readFile(DATA_FILE, 'utf8'));

  await Promise.all([Author.deleteMany(), Admin.deleteMany(), Book.deleteMany(), Ticket.deleteMany()]);

  const [authorHash, adminHash] = await Promise.all([
    bcrypt.hash(AUTHOR_PASSWORD, 10),
    bcrypt.hash(ADMIN_PASSWORD, 10),
  ]);

  await Admin.create([
    { name: 'BookLeaf Support', email: 'admin@bookleaf.com', passwordHash: adminHash },
    { name: 'BookLeaf Ops', email: 'ops@bookleaf.com', passwordHash: adminHash },
  ]);

  let bookCount = 0;
  for (const a of authors) {
    const author = await Author.create({
      authorId: a.author_id,
      name: a.name,
      email: a.email,
      passwordHash: authorHash,
      phone: a.phone,
      city: a.city,
      joinedDate: toDate(a.joined_date),
    });

    const books = a.books.map((b) => ({
      bookId: b.book_id,
      author: author._id,
      title: b.title,
      isbn: b.isbn,
      genre: b.genre,
      publicationDate: toDate(b.publication_date),
      status: b.status,
      mrp: b.mrp,
      authorRoyaltyPerCopy: b.author_royalty_per_copy,
      totalCopiesSold: b.total_copies_sold,
      totalRoyaltyEarned: b.total_royalty_earned,
      royaltyPaid: b.royalty_paid,
      royaltyPending: b.royalty_pending,
      lastRoyaltyPayoutDate: toDate(b.last_royalty_payout_date),
      printPartner: b.print_partner,
      availableOn: b.available_on,
    }));
    await Book.insertMany(books);
    bookCount += books.length;
  }

  await Promise.all([Author, Admin, Book, Ticket].map((M) => M.syncIndexes()));
  console.log(`Seeded ${authors.length} authors, ${bookCount} books, 2 admins.`);
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
