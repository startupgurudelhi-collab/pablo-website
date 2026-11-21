import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import { SESSION_COOKIE_NAME, SESSION_TTL_MS, getSessionSecret } from './config.ts';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  if (!salt || !keyHex) return false;
  const keyBuffer = Buffer.from(keyHex, 'hex');
  const derivedBuffer = crypto.scryptSync(password, salt, 64);
  if (keyBuffer.length !== derivedBuffer.length) return false;
  return crypto.timingSafeEqual(keyBuffer, derivedBuffer);
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function signToken(token: string): string {
  const secret = getSessionSecret();
  const sig = crypto.createHmac('sha256', secret).update(token).digest('hex');
  return `${token}.${sig}`;
}

export function verifySignedToken(signedValue: string | undefined): string | null {
  if (!signedValue || typeof signedValue !== 'string') return null;
  const dotIdx = signedValue.lastIndexOf('.');
  if (dotIdx <= 0) return null;
  const token = signedValue.slice(0, dotIdx);
  const sig = signedValue.slice(dotIdx + 1);
  if (!token || !sig) return null;
  const expected = crypto.createHmac('sha256', getSessionSecret()).update(token).digest('hex');
  const sigBuf = Buffer.from(sig, 'hex');
  const expBuf = Buffer.from(expected, 'hex');
  if (sigBuf.length !== expBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  return token;
}

export function isRequestHttps(req: Request): boolean {
  if (req.secure) return true;
  const proto = req.headers['x-forwarded-proto'];
  if (typeof proto === 'string') {
    return proto.split(',')[0].trim().toLowerCase() === 'https';
  }
  return false;
}

export function setSessionCookie(req: Request, res: Response, token: string): void {
  const signed = signToken(token);
  const https = isRequestHttps(req);
  res.cookie(SESSION_COOKIE_NAME, signed, {
    httpOnly: true,
    secure: https,
    sameSite: https ? 'none' : 'lax',
    maxAge: SESSION_TTL_MS,
    path: '/',
  });
}

export function clearSessionCookie(req: Request, res: Response): void {
  const https = isRequestHttps(req);
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: https,
    sameSite: https ? 'none' : 'lax',
    path: '/',
  });
}
