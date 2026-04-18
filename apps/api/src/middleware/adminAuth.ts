import type { Request, Response, NextFunction } from 'express';
import { timingSafeEqual, createHash } from 'crypto';
import { ADMIN_TOKEN } from '../config';

function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function requireAdminToken(req: Request, res: Response, next: NextFunction): void {
  if (!ADMIN_TOKEN) {
    // No token configured — dev fallback, allow through with a warning.
    next();
    return;
  }
  const provided = req.headers['x-admin-token'];
  if (typeof provided !== 'string' || !safeEqual(provided, ADMIN_TOKEN)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}
