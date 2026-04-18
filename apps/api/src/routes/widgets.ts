import { Router, type Router as IRouter } from 'express';
import path from 'path';
import fs from 'fs';
import { WidgetManifestSchema } from '@xemd/widget-types';
import { db } from '../store/db';
import { WIDGETS_DIR } from '../config';
import { requireAdminToken } from '../middleware/adminAuth';

const router: IRouter = Router();

const WIDGET_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function isValidWidgetId(id: unknown): id is string {
  return typeof id === 'string' && WIDGET_ID_RE.test(id);
}

const MANIFEST_SIZE_LIMIT = 64_000; // bytes — valid manifests are well under 1KB

function loadManifests() {
  const results: Array<{ manifest: any; source: 'official' | 'community' }> = [];
  const seenIds = new Set<string>();

  for (const source of ['official', 'community'] as const) {
    const dir = path.join(WIDGETS_DIR, source);
    if (!fs.existsSync(dir)) continue;

    for (const entry of fs.readdirSync(dir)) {
      // Skip anything that looks like a filesystem artifact
      if (entry.startsWith('.')) continue;

      const manifestPath = path.join(dir, entry, 'widget.json');
      if (!fs.existsSync(manifestPath)) continue;

      try {
        const stat = fs.statSync(manifestPath);
        if (stat.size > MANIFEST_SIZE_LIMIT) {
          console.warn(`[widgets] manifest too large, skipping: ${entry}`);
          continue;
        }

        const raw = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const parsed = WidgetManifestSchema.safeParse(raw);

        if (parsed.success) {
          if (parsed.data.id !== entry) {
            console.warn(`[widgets] manifest id "${parsed.data.id}" does not match directory "${entry}", skipping`);
            continue;
          }
          if (seenIds.has(parsed.data.id)) {
            console.warn(`[widgets] duplicate widget id "${parsed.data.id}" in ${source}/, skipping`);
            continue;
          }
          seenIds.add(parsed.data.id);
          results.push({ manifest: parsed.data, source });
        } else {
          console.error(`[widgets] invalid manifest for ${entry}:`, parsed.error.flatten());
        }
      } catch (e) {
        console.error(`[widgets] failed to read manifest for ${entry}:`, e);
      }
    }
  }

  return results;
}

// GET /api/widgets
router.get('/widgets', (_req, res) => {
  const manifests = loadManifests();

  const widgets = manifests.map(({ manifest, source }) => {
    const state = db
      .prepare('SELECT enabled FROM widget_state WHERE widget_id = ?')
      .get(manifest.id) as { enabled: number } | undefined;
    const row = db
      .prepare('SELECT settings FROM widget_settings WHERE widget_id = ?')
      .get(manifest.id) as { settings: string } | undefined;

    return {
      ...manifest,
      source,
      enabled: state?.enabled !== 0,
      currentValues: row ? JSON.parse(row.settings) : {},
    };
  });

  res.json(widgets);
});

// PATCH /api/widgets/:id/state
router.patch('/widgets/:id/state', requireAdminToken, (req, res) => {
  const { id } = req.params;
  const { enabled } = req.body;

  if (!isValidWidgetId(id)) {
    res.status(400).json({ error: 'invalid widget id' });
    return;
  }

  if (typeof enabled !== 'boolean') {
    res.status(400).json({ error: 'enabled must be a boolean' });
    return;
  }

  db.prepare('INSERT OR REPLACE INTO widget_state (widget_id, enabled) VALUES (?, ?)')
    .run(id, enabled ? 1 : 0);

  res.json({ ok: true });
});

export default router;
