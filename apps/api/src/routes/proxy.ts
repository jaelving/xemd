import { Router, type Router as IRouter } from 'express';
import dns from 'dns';
import micromatch from 'micromatch';
import { db } from '../store/db';
import { decrypt } from '../crypto/secrets';
import { MASTER_KEY } from '../config';
import { loadManifest } from '../lib/manifest';

const router: IRouter = Router();

function isPrivateIP(ip: string): boolean {
  // IPv4-mapped IPv6 — extract the inner IPv4
  const v4match = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  const addr = v4match ? v4match[1] : ip;

  // IPv4 ranges
  if (/^127\./.test(addr)) return true;                    // loopback
  if (/^10\./.test(addr)) return true;                     // RFC 1918
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(addr)) return true; // RFC 1918
  if (/^192\.168\./.test(addr)) return true;               // RFC 1918
  if (/^169\.254\./.test(addr)) return true;               // link-local
  if (addr === '0.0.0.0') return true;

  // IPv6 ranges
  if (addr === '::1') return true;                         // loopback
  if (/^fe80:/i.test(addr)) return true;                   // link-local
  if (/^f[cd]/i.test(addr)) return true;                   // ULA

  return false;
}

async function checkSsrf(url: string): Promise<string | null> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return 'invalid URL';
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, ''); // strip IPv6 brackets

  // Block obvious hostnames before DNS resolution
  if (hostname === 'localhost' || hostname.endsWith('.local')) {
    return 'requests to internal hosts are not allowed';
  }

  try {
    const { address } = await dns.promises.lookup(hostname);
    if (isPrivateIP(address)) {
      return 'requests to internal network addresses are not allowed';
    }
  } catch {
    return 'DNS resolution failed';
  }

  return null;
}

// Kebab-case widget IDs only — prevents path traversal via body-supplied widgetId.
const WIDGET_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isValidWidgetId(id: unknown): id is string {
  return typeof id === 'string' && WIDGET_ID_RE.test(id);
}

function matchGlob(pattern: string, url: string): boolean {
  return micromatch.isMatch(url, pattern, { dot: true });
}

function resolveUrl(
  url: string,
  widgetId: string,
  allowedSecrets: string[],
): string {
  return url.replace(/\{\{secret:([^}]+)\}\}/g, (_match, key: string) => {
    if (!/^[a-zA-Z0-9_]+$/.test(key) || !allowedSecrets.includes(key)) {
      throw new Error('secret placeholder not permitted');
    }
    const row = db
      .prepare('SELECT value FROM secrets WHERE widget_id = ? AND key = ?')
      .get(widgetId, key) as { value: string } | undefined;
    return row ? encodeURIComponent(decrypt(row.value, MASTER_KEY)) : '';
  });
}

// Headers that must never be forwarded to upstream servers.
const BLOCKED_HEADERS = new Set([
  'host', 'cookie', 'set-cookie', 'authorization',
  'proxy-authorization', 'proxy-connection',
  'x-forwarded-for', 'x-forwarded-host', 'x-forwarded-proto',
  'x-real-ip', 'forwarded',
  'connection', 'keep-alive', 'transfer-encoding', 'te', 'upgrade',
  'x-admin-token',
]);

async function resolveHeaders(
  headers: Record<string, string>,
  widgetId: string,
  allowedSecrets: string[],
): Promise<Record<string, string>> {
  const resolved: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    if (BLOCKED_HEADERS.has(k.toLowerCase())) continue;
    const match = v.match(/^\{\{secret:([^}]+)\}\}$/);
    if (match) {
      const key = match[1];
      if (!/^[a-zA-Z0-9_]+$/.test(key) || !allowedSecrets.includes(key)) {
        throw new Error('secret placeholder not permitted');
      }
      const row = db
        .prepare('SELECT value FROM secrets WHERE widget_id = ? AND key = ?')
        .get(widgetId, key) as { value: string } | undefined;
      resolved[k] = row ? decrypt(row.value, MASTER_KEY) : '';
    } else {
      resolved[k] = v;
    }
  }
  return resolved;
}

const ALLOWED_METHODS = new Set(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);

router.post('/proxy', async (req, res) => {
  const { widgetId, url, method = 'GET', headers = {}, body = null } = req.body;

  if (typeof method !== 'string' || !ALLOWED_METHODS.has(method.toUpperCase())) {
    res.status(400).json({ error: 'invalid HTTP method' });
    return;
  }

  if (!isValidWidgetId(widgetId)) {
    res.status(400).json({ error: 'invalid widgetId' });
    return;
  }

  if (typeof url !== 'string' || !url.startsWith('https://')) {
    res.status(400).json({ error: 'url must be an https:// string' });
    return;
  }

  const manifest = loadManifest(widgetId);
  if (!manifest) {
    res.status(404).json({ error: `widget "${widgetId}" not found` });
    return;
  }

  // Glob check against the original URL (with {{secret:...}} placeholders intact)
  const allowed = manifest.permissions.proxy.some(pattern => matchGlob(pattern, url));
  if (!allowed) {
    res.status(403).json({ error: 'proxy request not permitted' });
    return;
  }

  // Resolve {{secret:KEY}} placeholders in the URL
  let resolvedUrl: string;
  try {
    resolvedUrl = resolveUrl(url, widgetId, manifest.permissions.secrets);
  } catch (e) {
    console.error('[proxy] resolveUrl error:', e);
    res.status(403).json({ error: 'proxy request not permitted' });
    return;
  }

  let resolvedHeaders: Record<string, string>;
  try {
    resolvedHeaders = await resolveHeaders(headers, widgetId, manifest.permissions.secrets);
  } catch (e) {
    console.error('[proxy] resolveHeaders error:', e);
    res.status(403).json({ error: 'proxy request not permitted' });
    return;
  }

  // SSRF check against the resolved URL (after secret substitution)
  const ssrfError = await checkSsrf(resolvedUrl);
  if (ssrfError) {
    res.status(403).json({ error: ssrfError });
    return;
  }

  const MAX_RESPONSE_BYTES = 1_048_576; // 1 MB

  try {
    const upstream = await fetch(resolvedUrl, {
      method,
      headers: resolvedHeaders,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10_000),
      redirect: 'manual', // Don't follow redirects — they could bypass the SSRF check
    });

    const contentLength = upstream.headers.get('content-length');
    if (contentLength !== null && parseInt(contentLength, 10) > MAX_RESPONSE_BYTES) {
      res.status(502).json({ error: 'upstream response too large' });
      return;
    }

    const chunks: Buffer[] = [];
    let totalBytes = 0;
    for await (const chunk of upstream.body as AsyncIterable<Uint8Array>) {
      totalBytes += chunk.byteLength;
      if (totalBytes > MAX_RESPONSE_BYTES) {
        res.status(502).json({ error: 'upstream response too large' });
        return;
      }
      chunks.push(Buffer.from(chunk));
    }
    const responseBody = Buffer.concat(chunks).toString('utf8');

    const responseHeaders: Record<string, string> = {};
    upstream.headers.forEach((value, key) => { responseHeaders[key] = value; });

    res.json({ status: upstream.status, headers: responseHeaders, body: responseBody });
  } catch (e) {
    res.status(502).json({ error: 'upstream request failed' });
  }
});

export default router;
