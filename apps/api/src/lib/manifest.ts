import path from 'path';
import fs from 'fs';
import { WidgetManifestSchema } from '@xemd/widget-types';
import { WIDGETS_DIR } from '../config';

const MANIFEST_SIZE_LIMIT = 64_000;

export function loadManifest(widgetId: string) {
  for (const source of ['official', 'community']) {
    const manifestPath = path.join(WIDGETS_DIR, source, widgetId, 'widget.json');
    if (!fs.existsSync(manifestPath)) continue;
    try {
      const stat = fs.statSync(manifestPath);
      if (stat.size > MANIFEST_SIZE_LIMIT) return null;
      const raw = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      const parsed = WidgetManifestSchema.safeParse(raw);
      if (parsed.success && parsed.data.id === widgetId) return parsed.data;
      return null;
    } catch {
      return null;
    }
  }
  return null;
}
