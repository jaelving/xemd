import { Router, type Router as IRouter } from 'express';
import { db } from '../store/db';
import { decrypt } from '../crypto/secrets';
import { MASTER_KEY } from '../config';
import { loadManifest } from '../lib/manifest';

const router: IRouter = Router();

const WIDGET_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SECRET_KEY_RE = /^[a-zA-Z0-9_]+$/;

function isValidWidgetId(id: string): boolean {
  return WIDGET_ID_RE.test(id);
}

function isValidSecretKey(key: string): boolean {
  return SECRET_KEY_RE.test(key) && key.length <= 64;
}

// GET /api/widget-secrets/:widgetId/:key
// Authorized by manifest permissions — no admin token required.
router.get('/widget-secrets/:widgetId/:key', (req, res) => {
  const { widgetId, key } = req.params;

  if (!isValidWidgetId(widgetId) || !isValidSecretKey(key)) {
    res.status(400).json({ error: 'invalid widgetId or key' });
    return;
  }

  const manifest = loadManifest(widgetId);
  if (!manifest) {
    res.status(404).json({ error: `widget "${widgetId}" not found` });
    return;
  }

  if (!manifest.permissions.secrets.includes(key)) {
    res.status(403).json({ error: 'secret not permitted' });
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

export default router;
