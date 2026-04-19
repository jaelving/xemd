import { Router, type Router as IRouter } from 'express';
import { db } from '../store/db';
import { encrypt, decrypt } from '../crypto/secrets';
import { MASTER_KEY } from '../config';
import { requireAdminToken } from '../middleware/adminAuth';

const router: IRouter = Router();

const WIDGET_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SECRET_KEY_RE = /^[a-zA-Z0-9_]+$/;

function isValidWidgetId(id: string): boolean {
  return WIDGET_ID_RE.test(id);
}

function isValidSecretKey(key: string): boolean {
  return SECRET_KEY_RE.test(key) && key.length <= 64;
}

// GET /api/secrets/:widgetId/:key
router.get('/secrets/:widgetId/:key', requireAdminToken, (req, res) => {
  const { widgetId, key } = req.params as { widgetId: string; key: string };

  if (!isValidWidgetId(widgetId) || !isValidSecretKey(key)) {
    res.status(400).json({ error: 'invalid widgetId or key' });
    return;
  }

  const row = db
    .prepare('SELECT value FROM secrets WHERE widget_id = ? AND key = ?')
    .get(widgetId, key) as { value: string } | undefined;

  if (!row) {
    res.json({ value: null });
    return;
  }

  try {
    res.json({ value: decrypt(row.value, MASTER_KEY) });
  } catch {
    res.status(500).json({ error: 'failed to decrypt secret' });
  }
});

// PUT /api/secrets/:widgetId/:key
router.put('/secrets/:widgetId/:key', requireAdminToken, (req, res) => {
  const { widgetId, key } = req.params as { widgetId: string; key: string };

  if (!isValidWidgetId(widgetId) || !isValidSecretKey(key)) {
    res.status(400).json({ error: 'invalid widgetId or key' });
    return;
  }

  const { value } = req.body;
  if (typeof value !== 'string') {
    res.status(400).json({ error: 'value must be a string' });
    return;
  }

  db.prepare('INSERT OR REPLACE INTO secrets (widget_id, key, value) VALUES (?, ?, ?)')
    .run(widgetId, key, encrypt(value, MASTER_KEY));

  res.json({ ok: true });
});

// DELETE /api/secrets/:widgetId/:key
router.delete('/secrets/:widgetId/:key', requireAdminToken, (req, res) => {
  const { widgetId, key } = req.params as { widgetId: string; key: string };

  if (!isValidWidgetId(widgetId) || !isValidSecretKey(key)) {
    res.status(400).json({ error: 'invalid widgetId or key' });
    return;
  }

  db.prepare('DELETE FROM secrets WHERE widget_id = ? AND key = ?').run(widgetId, key);
  res.json({ ok: true });
});

export default router;
