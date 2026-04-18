import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import type { Database as DatabaseType } from 'better-sqlite3';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const SALT_LENGTH = 16;

export function encrypt(plaintext: string, masterKey: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const key = scryptSync(masterKey, salt, 32);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: salt:iv:tag:ciphertext (all base64)
  return [salt.toString('base64'), iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join(':');
}

export function decrypt(ciphertext: string, masterKey: string): string {
  const parts = ciphertext.split(':');

  if (parts.length !== 4) {
    throw new Error('invalid ciphertext format: legacy-salt secrets must be migrated before use');
  }

  const [saltB64, ivB64, tagB64, dataB64] = parts;
  const key = scryptSync(masterKey, Buffer.from(saltB64, 'base64'), 32);
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const data = Buffer.from(dataB64, 'base64');
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(data) + decipher.final('utf8');
}

// Migrates any secrets still stored in the legacy 3-part format (static salt)
// to the current 4-part format (per-secret random salt). Runs at startup.
export function migrateLegacySecrets(db: DatabaseType, masterKey: string): void {
  const LEGACY_SALT = 'xemd-secrets-v1';

  const rows = db
    .prepare('SELECT widget_id, key, value FROM secrets')
    .all() as Array<{ widget_id: string; key: string; value: string }>;

  const update = db.prepare('UPDATE secrets SET value = ? WHERE widget_id = ? AND key = ?');

  const migrate = db.transaction(() => {
    let count = 0;
    for (const row of rows) {
      const parts = row.value.split(':');
      if (parts.length !== 3) continue; // already current format

      // Decrypt with legacy static salt
      const [ivB64, tagB64, dataB64] = parts;
      const legacyKey = scryptSync(masterKey, LEGACY_SALT, 32);
      const iv = Buffer.from(ivB64, 'base64');
      const tag = Buffer.from(tagB64, 'base64');
      const data = Buffer.from(dataB64, 'base64');
      const decipher = createDecipheriv(ALGORITHM, legacyKey, iv);
      decipher.setAuthTag(tag);
      const plaintext = decipher.update(data) + decipher.final('utf8');

      // Re-encrypt with current per-secret salt format
      update.run(encrypt(plaintext, masterKey), row.widget_id, row.key);
      count++;
    }
    if (count > 0) {
      console.log(`[xemd-api] migrated ${count} legacy-format secret(s) to current encryption format`);
    }
  });

  migrate();
}
