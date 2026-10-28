import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { uploadAttachments } from '../middleware/upload.middleware.js';
import { createTicket, getAttachment } from '../controllers/ticket.controller.js';

const router = Router();

router.post('/', authenticate, authorize('author'), uploadAttachments, createTicket);
router.get('/:id/attachments/:filename', authenticate, authorize('author', 'admin'), getAttachment);

export default router;
