import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const PORT = Number(process.env.PORT || 3000);
const RUNNING_FROM_DIST =
  import.meta.url.replace(/\\/g, '/').endsWith('/dist/server.js') ||
  Boolean(process.argv[1]?.replace(/\\/g, '/').endsWith('/dist/server.js'));
export const IS_PRODUCTION = process.env.NODE_ENV === 'production' || RUNNING_FROM_DIST;

export const DATA_DIR = path.resolve(process.cwd(), process.env.DATA_DIR || './data');
export const MEDIA_DIR = path.resolve(process.cwd(), process.env.MEDIA_DIR || './storage/media');
export const ORIGINALS_DIR = path.join(MEDIA_DIR, 'originals');
export const THUMBNAILS_DIR = path.join(MEDIA_DIR, 'thumbnails');
export const DB_FILE_PATH = path.join(DATA_DIR, 'pablo-db.json');

export function ensureStorageDirectories(): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(ORIGINALS_DIR, { recursive: true });
  fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
}

export function getSessionSecret(): string {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16) {
    return process.env.SESSION_SECRET;
  }
  ensureStorageDirectories();
  const secretPath = path.join(DATA_DIR, '.session-secret');
  if (fs.existsSync(secretPath)) {
    const existing = fs.readFileSync(secretPath, 'utf8').trim();
    if (existing.length >= 32) {
      return existing;
    }
  }
  const generated = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(secretPath, generated, { mode: 0o600 });
  return generated;
}

export const INITIAL_ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@pablo.studio').trim().toLowerCase();
export const INITIAL_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'pablo-atelier-2026';

export const MYSQL_HOST = (process.env.MYSQL_HOST || '127.0.0.1').trim();
export const MYSQL_PORT = Number(process.env.MYSQL_PORT || 3306);
export const MYSQL_DATABASE = (process.env.MYSQL_DATABASE || '').trim();
export const MYSQL_USER = (process.env.MYSQL_USER || '').trim();
export const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || '';
export const MYSQL_SSL = process.env.MYSQL_SSL === 'true';

export function isMysqlConfigured(): boolean {
  return Boolean(MYSQL_DATABASE && MYSQL_USER);
}

export const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
export const ALLOWED_VIDEO_MIMES = new Set(['video/mp4']);
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // 15 MB
export const MAX_VIDEO_BYTES = 80 * 1024 * 1024; // 80 MB
export const SESSION_COOKIE_NAME = 'pablo_admin_session';
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
