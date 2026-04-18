import { randomBytes } from 'crypto';
import path from 'path';

const rawKey = process.env.XEMD_MASTER_KEY;

if (!rawKey) {
  if (process.env.NODE_ENV === 'production') {
    console.error(
      '[xemd-api] FATAL: XEMD_MASTER_KEY is not set.\n' +
      '  Generate one with: openssl rand -hex 32\n' +
      '  Then set it in your .env file before starting.',
    );
    process.exit(1);
  }
  console.warn(
    '[xemd-api] WARNING: XEMD_MASTER_KEY is not set.\n' +
    '  An ephemeral key is being used — any stored secrets will be\n' +
    '  unreadable after a restart. Set XEMD_MASTER_KEY in .env for persistence.',
  );
}

export const MASTER_KEY: string = rawKey ?? randomBytes(32).toString('hex');

const rawAdminToken = process.env.XEMD_ADMIN_TOKEN;
if (!rawAdminToken) {
  if (process.env.NODE_ENV === 'production') {
    console.error(
      '[xemd-api] FATAL: XEMD_ADMIN_TOKEN is not set.\n' +
      '  Generate one with: openssl rand -hex 32\n' +
      '  Then set it in your .env file before starting.',
    );
    process.exit(1);
  }
  console.warn(
    '[xemd-api] WARNING: XEMD_ADMIN_TOKEN is not set.\n' +
    '  Admin routes are unprotected. Set XEMD_ADMIN_TOKEN in .env.',
  );
}
export const ADMIN_TOKEN: string | undefined = rawAdminToken;

export const PORT = Number(process.env.PORT ?? 3001);

export const WIDGETS_DIR =
  process.env.WIDGETS_DIR ?? path.join(process.cwd(), '..', '..', 'widgets');
