import crypto from 'node:crypto';
import type {NextFunction, Request, Response} from 'express';
import {db} from './db.ts';
import type {AdminUser} from '../src/types.ts';

const EPHEMERAL_SECRET = crypto.randomBytes(32).toString('hex');

function getSigningSecret(): string {
  const envSecret = process.env.SESSION_SECRET?.trim();
  return envSecret && envSecret.length >= 16 ? envSecret : EPHEMERAL_SECRET;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, hexKey] = parts;
  if (!salt || !hexKey) return false;
  const expected = Buffer.from(hexKey, 'hex');
  const actual = crypto.scryptSync(password, salt, 64);
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

interface TokenPayload {
  sub: number;
  username: string;
  full_name: string;
  role: string;
  exp: number;
}

export function signAuthToken(user: AdminUser): string {
  const payload: TokenPayload = {
    sub: user.id,
    username: user.username,
    full_name: user.full_name,
    role: user.role,
    exp: Date.now() + 1000 * 60 * 60 * 12, // 12 hours
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', getSigningSecret())
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifyAuthToken(token: string): AdminUser | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  if (!encoded || !sig) return null;

  const expectedSig = crypto
    .createHmac('sha256', getSigningSecret())
    .update(encoded)
    .digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as TokenPayload;
    if (!parsed || typeof parsed.exp !== 'number' || parsed.exp < Date.now()) {
      return null;
    }
    return {
      id: parsed.sub,
      username: parsed.username,
      full_name: parsed.full_name,
      role: parsed.role,
    };
  } catch {
    return null;
  }
}

export function isEnvAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.trim().length > 0);
}

export function isAdminInitialized(): boolean {
  const count = (db.prepare('SELECT COUNT(*) as c FROM users').get() as {c: number}).c;
  return count > 0 || isEnvAdminConfigured();
}

export interface AuthenticatedRequest extends Request {
  adminUser?: AdminUser;
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({error: 'Autentikasi admin diperlukan.'});
    return;
  }
  const token = header.slice('Bearer '.length).trim();
  const user = verifyAuthToken(token);
  if (!user) {
    res.status(401).json({error: 'Sesi admin tidak valid atau telah berakhir.'});
    return;
  }
  req.adminUser = user;
  next();
}
