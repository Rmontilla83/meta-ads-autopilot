import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;

function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required. Never use a default key in production.');
  }
  return key;
}

function deriveKey(salt: Buffer): Buffer {
  return scryptSync(getEncryptionKey(), salt, KEY_LENGTH);
}

export function encrypt(text: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const key = deriveKey(salt);
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Format: salt:iv:tag:ciphertext (all base64)
  return [
    salt.toString('base64'),
    iv.toString('base64'),
    tag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':');
}

export function decrypt(encryptedText: string): string {
  // Support legacy crypto-js format (no colons = old format)
  if (!encryptedText.includes(':')) {
    return decryptLegacy(encryptedText);
  }

  const parts = encryptedText.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted text format');
  }

  const [saltB64, ivB64, tagB64, cipherB64] = parts;
  const salt = Buffer.from(saltB64, 'base64');
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const encrypted = Buffer.from(cipherB64, 'base64');

  const key = deriveKey(salt);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

/**
 * Backward-compatible decryption for tokens encrypted with crypto-js.
 * Uses dynamic import to avoid bundling crypto-js if not needed.
 */
function decryptLegacy(encryptedText: string): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const CryptoJS = require('crypto-js');
  const bytes = CryptoJS.AES.decrypt(encryptedText, getEncryptionKey());
  return bytes.toString(CryptoJS.enc.Utf8);
}
