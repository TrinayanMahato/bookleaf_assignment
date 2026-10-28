import { Router } from 'express';
import { authorLogin, adminLogin } from '../controllers/auth.controller.js';

const router = Router();

router.post('/author/login', authorLogin);
router.post('/admin/login', adminLogin);

export default router;
