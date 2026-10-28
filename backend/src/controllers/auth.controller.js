import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import Author from '../models/Author.js';
import Admin from '../models/Admin.js';

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('A valid email is required'),
  password: z.string({ error: 'Password is required' }).min(1, 'Password is required'),
});

const signToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1d' });

// POST /api/auth/author/login
export const authorLogin = async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
  }

  try {
    const { email, password } = parsed.data;
    const author = await Author.findOne({ email }).select('+passwordHash');
    if (!author || !(await bcrypt.compare(password, author.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken(author._id, 'author');
    return res.status(200).json({
      token,
      user: { id: author._id, authorId: author.authorId, name: author.name, email: author.email, role: 'author' },
    });
  } catch (err) {
    console.error('Author login failed:', err);
    return res.status(500).json({ error: 'Could not log in, please try again' });
  }
};

// POST /api/auth/admin/login
export const adminLogin = async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
  }

  try {
    const { email, password } = parsed.data;
    const admin = await Admin.findOne({ email }).select('+passwordHash');
    if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken(admin._id, 'admin');
    return res.status(200).json({
      token,
      user: { id: admin._id, name: admin.name, email: admin.email, role: 'admin' },
    });
  } catch (err) {
    console.error('Admin login failed:', err);
    return res.status(500).json({ error: 'Could not log in, please try again' });
  }
};
