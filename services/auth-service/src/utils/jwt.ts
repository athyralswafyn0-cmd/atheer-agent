import * as jwt from 'jsonwebtoken';

export interface JWTPayload {
  userId: string;
  organizationId: string | null;
  role: string;
  email: string;
  iss: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  userId: string;
  type: 'refresh';
  iat?: number;
  exp?: number;
}

const JWT_SECRET: string = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '7d';
const REFRESH_TOKEN_EXPIRES_IN: string = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';

export function signAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp' | 'iss'>): string {
  return jwt.sign(
    { ...payload, iss: 'atheer-agent' },
    JWT_SECRET as any,
    { expiresIn: JWT_EXPIRES_IN as any }
  );
}

export function signRefreshToken(userId: string): string {
  return jwt.sign(
    { userId, type: 'refresh' },
    JWT_SECRET as any,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN as any }
  );
}

export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as RefreshTokenPayload;
    if (decoded.type !== 'refresh') return null;
    return decoded;
  } catch {
    return null;
  }
}

export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch {
    return null;
  }
}
