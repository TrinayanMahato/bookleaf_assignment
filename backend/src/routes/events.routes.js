import { Router } from 'express';
import { subscribe } from '../controllers/events.controller.js';

const router = Router();

// Auth is checked inside the controller from ?token=, since EventSource can't set headers.
router.get('/', subscribe);

export default router;
