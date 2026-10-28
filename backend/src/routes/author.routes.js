import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { getAuthorBooks, getAuthorTickets } from '../controllers/author.controller.js';

const router = Router();

router.get('/:authorId/books', authenticate, authorize('author', 'admin'), getAuthorBooks);
router.get('/:authorId/tickets', authenticate, authorize('author', 'admin'), getAuthorTickets);

export default router;
