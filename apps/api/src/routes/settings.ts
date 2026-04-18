import { Router, type Router as IRouter } from 'express';
import { db } from '../store/db';
import { requireAdminToken } from '../middleware/adminAuth';

const router: IRouter = Router();

const WIDGET_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isValidWidgetId(id: string): boolean {
  return WIDGET_ID_RE.test(id);
}

// GET /api/settings/:widgetId
router.get('/settings/:widgetId', (req, res) => {
  const { widgetId } = req.params;

  if (!isValidWidgetId(widgetId)) {
    res.status(400).json({ error: 'invalid widgetId' });
    return;
  }

  const row = db
    .prepare('SELECT settings FROM widget_settings WHERE widget_id = ?')
    .get(widgetId) as { settings: string } | undefined;

  res.json(row ? JSON.parse(row.settings) : {});
});

// PUT /api/settings/:widgetId
router.put('/settings/:widgetId', requireAdminToken, (req, res) => {
  const { widgetId } = req.params;

  if (!isValidWidgetId(widgetId)) {
    res.status(400).json({ error: 'invalid widgetId' });
    return;
  }

  const settings = req.body;
  if (typeof settings !== 'object' || settings === null || Array.isArray(settings)) {
    res.status(400).json({ error: 'body must be a JSON object' });
    return;
  }

  db.prepare('INSERT OR REPLACE INTO widget_settings (widget_id, settings) VALUES (?, ?)')
    .run(widgetId, JSON.stringify(settings));

  res.json({ ok: true });
});

export default router;
