import { Router, type Router as IRouter } from 'express';
import { requireAdminToken } from '../middleware/adminAuth';

const router: IRouter = Router();

// GET /api/auth/verify — validates the admin token.
router.get('/auth/verify', requireAdminToken, (_req, res) => {
  res.json({ ok: true });
});

export default router;
