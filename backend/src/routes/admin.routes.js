import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { listTickets, getTicket, updateTicket, addNote, generateTicketDraft, sendReply } from '../controllers/admin.controller.js';

const router = Router();

router.use(authenticate, authorize('admin'));

router.get('/tickets', listTickets);
router.get('/tickets/:id', getTicket);
router.patch('/tickets/:id', updateTicket);
router.post('/tickets/:id/notes', addNote);
router.post('/tickets/:id/draft', generateTicketDraft);
router.post('/tickets/:id/replies', sendReply);

export default router;
