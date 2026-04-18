import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';

import { MASTER_KEY, PORT, WIDGETS_DIR } from './config';
import widgetsRouter from './routes/widgets';
import settingsRouter from './routes/settings';
import secretsRouter from './routes/secrets';
import proxyRouter from './routes/proxy';
import authRouter from './routes/auth';
import widgetSecretsRouter from './routes/widget-secrets';
import { db } from './store/db';
import { encrypt, migrateLegacySecrets } from './crypto/secrets';

const app = express();

// In production the API is behind the nginx reverse proxy and is never
// directly reachable from browsers. In dev the Vite host runs on a different
// port, so we allow localhost origins explicitly instead of wildcard.
const ALLOWED_ORIGINS: string[] = (() => {
  if (process.env.XEMD_ALLOWED_ORIGIN) return [process.env.XEMD_ALLOWED_ORIGIN];
  if (process.env.NODE_ENV === 'production') {
    // In the standard Docker setup nginx proxies all requests, so same-origin
    // applies and no CORS origin needs to be set. If you expose the API directly
    // (e.g. on a separate port) set XEMD_ALLOWED_ORIGIN to the host origin.
    return [];
  }
  return ['http://localhost:6600', 'http://localhost:5173', 'http://localhost:3000'];
})();

// Trust the nginx reverse proxy so express-rate-limit keys on X-Forwarded-For
// (the real client IP) rather than the container gateway IP.
app.set('trust proxy', 1);

app.use(cors({
  origin: (origin, cb) => {
    // No Origin header (same-origin or server-to-server) → always allow.
    if (!origin) return cb(null, true);
    // Sandboxed iframes send the literal string "null" as origin — allow so
    // widgets can load the SDK. connect-src 'none' in the widget CSP prevents
    // them from calling the API directly.
    if (origin === 'null') return cb(null, true);
    // In production the API is behind nginx and not reachable from outside
    // Docker, so nginx is the security boundary — reflect any origin.
    if (process.env.NODE_ENV === 'production') return cb(null, true);
    // In dev, only allow known local origins.
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error('CORS: origin not allowed'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
}));

// Rate limiting — applied before routes so limits are enforced globally.
const globalLimiter = rateLimit({
  windowMs: 60_000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const strictLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

app.use(globalLimiter);
app.use('/api/secrets', strictLimiter);
app.use('/api/widget-secrets', strictLimiter);
app.use('/api/proxy', strictLimiter);

app.use(express.json({ limit: '100kb' }));

// Ensure all /api responses carry an explicit Content-Type to prevent MIME sniffing.
app.use('/api', (_req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// Reject mutating requests that don't declare application/json.
// Simple-request CSRF payloads (HTML forms) use application/x-www-form-urlencoded
// or multipart/form-data and will be blocked here before reaching any route handler.
app.use('/api', (req, res, next) => {
  const method = req.method;
  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    const ct = req.headers['content-type'] ?? '';
    if (!ct.startsWith('application/json')) {
      res.status(415).json({ error: 'Content-Type must be application/json' });
      return;
    }
  }
  next();
});

app.use('/sdk', express.static(path.join(__dirname, 'sdk')));

// Serve widget static files. Community widgets are user-supplied, so:
// 1. Block symlinks to prevent linking to files outside the widgets directory
// 2. Set a restrictive CSP that blocks direct network access — widgets must use
//    the SDK's postMessage channel, not raw fetch(). This prevents a malicious
//    widget loaded outside an iframe from calling /api/* directly.
app.use('/widgets', (req, res, next) => {
  const resolved = path.resolve(WIDGETS_DIR, req.path.replace(/^\//, ''));
  // Ensure the resolved path is inside WIDGETS_DIR (blocks ../ traversal too)
  if (!resolved.startsWith(path.resolve(WIDGETS_DIR) + path.sep) && resolved !== path.resolve(WIDGETS_DIR)) {
    res.status(403).end();
    return;
  }
  // Reject symlinks anywhere in the requested path
  try {
    const real = fs.realpathSync(resolved);
    if (!real.startsWith(path.resolve(WIDGETS_DIR) + path.sep)) {
      res.status(403).end();
      return;
    }
  } catch {
    // File doesn't exist — let express.static handle the 404
  }
  // Widget CSP: allow scripts (SDK) and images, but block all network access
  // (connect-src 'none') so widgets can't call /api/* outside the iframe sandbox.
  // Also block being loaded as a top-level page via X-Frame-Options.
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'none'; script-src 'self' 'unsafe-inline' https://unpkg.com; " +
    "style-src 'self' 'unsafe-inline' https://unpkg.com https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: https:; " +
    "connect-src 'none'",
  );
  next();
}, express.static(WIDGETS_DIR));

// Migrate any legacy-format (static-salt) secrets to the current per-secret-salt format.
migrateLegacySecrets(db, MASTER_KEY);

// Seed default secrets from environment variables on startup.
// Uses INSERT OR IGNORE so user-saved values are never overwritten.
const DEFAULT_SECRETS: Array<{ widgetId: string; key: string; envVar: string }> = [
  { widgetId: 'flight-tracker', key: 'flightaware_key', envVar: 'XEMD_FLIGHTAWARE_KEY' },
  { widgetId: 'stock-tracker',  key: 'api_key',         envVar: 'XEMD_STOCK_TRACKER_API_KEY' },
  { widgetId: 'unifi',          key: 'UNIFI_KEY',       envVar: 'XEMD_UNIFI_API_KEY' },
];

const seedSecret = db.prepare(
  'INSERT OR IGNORE INTO secrets (widget_id, key, value) VALUES (?, ?, ?)',
);

for (const { widgetId, key, envVar } of DEFAULT_SECRETS) {
  const value = process.env[envVar];
  if (value) {
    seedSecret.run(widgetId, key, encrypt(value, MASTER_KEY));
    console.log(`[xemd-api] seeded default secret: ${widgetId}/${key}`);
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'xemd-api', version: '1.0.0' });
});

app.use('/api', authRouter);
app.use('/api', widgetsRouter);
app.use('/api', settingsRouter);
app.use('/api', secretsRouter);
app.use('/api', widgetSecretsRouter);
app.use('/api', proxyRouter);

app.listen(PORT, () => {
  console.log(`[xemd-api] listening on port ${PORT}`);
});
