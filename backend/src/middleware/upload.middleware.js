import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB per image or PDF
const MAX_FILES = 3;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const storage = multer.diskStorage({
  destination: 'uploads/',
  // Random names so files can't collide or be guessed from the original filename.
  filename: (req, file, cb) =>
    cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) return cb(null, true);
    return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
  },
});

const MULTER_MESSAGES = {
  LIMIT_FILE_SIZE: 'Each file must be 2 MB or smaller',
  LIMIT_FILE_COUNT: `You can attach up to ${MAX_FILES} files`,
  LIMIT_UNEXPECTED_FILE: 'Only JPG, PNG, WEBP images and PDF files are allowed',
};

// Wraps multer so its errors become 400s with a readable message instead of 500s.
export const uploadAttachments = (req, res, next) => {
  upload.array('attachments', MAX_FILES)(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: MULTER_MESSAGES[err.code] || err.message });
    }
    return next(err);
  });
};
