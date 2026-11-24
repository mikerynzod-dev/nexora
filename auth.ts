import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { users } from '../../db/schema.ts';
import { adminAuth } from '../../lib/firebase-admin.ts';
import { env } from '../config/env.ts';

export interface AuthUser {
  id: number;
  uid: string | null;
  email: string;
  name: string;
  role: 'customer' | 'admin';
  isActive: boolean;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
  rawBody?: Buffer;
}

interface JwtPayload {
  userId: number;
  email: string;
  role: string;
}

async function resolveUserFromToken(token: string): Promise<AuthUser | null> {
  // 1. Try local server-signed JWT first if format matches or fallback to Firebase
  try {
    const decoded = jwt.verify(token, env.jwtSecret) as JwtPayload;
    if (decoded && typeof decoded.userId === 'number') {
      const [found] = await db
        .select({
          id: users.id,
          uid: users.uid,
          email: users.email,
          name: users.name,
          role: users.role,
          isActive: users.isActive,
        })
        .from(users)
        .where(eq(users.id, decoded.userId))
        .limit(1);

      if (!found || !found.isActive) return null;
      return {
        ...found,
        role: found.role === 'admin' ? 'admin' : 'customer',
      };
    }
  } catch {
    // Not a local JWT, try Firebase ID token below
  }

  // 2. Verify Firebase ID Token
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const email = (decodedToken.email || '').toLowerCase();
    if (!email) return null;

    const isDesignatedAdmin =
      email === env.ownerAdminEmail || (env.adminEmail && email === env.adminEmail);

    const displayName =
      decodedToken.name || email.split('@')[0] || 'NEXORA Member';

    // Check if user exists by uid or email
    const existingByUid = await db
      .select()
      .from(users)
      .where(eq(users.uid, decodedToken.uid))
      .limit(1);

    if (existingByUid[0]) {
      const current = existingByUid[0];
      if (!current.isActive) return null;
      if (isDesignatedAdmin && current.role !== 'admin') {
        const [updated] = await db
          .update(users)
          .set({ role: 'admin', updatedAt: new Date() })
          .where(eq(users.id, current.id))
          .returning();
        return {
          id: updated.id,
          uid: updated.uid,
          email: updated.email,
          name: updated.name,
          role: 'admin',
          isActive: updated.isActive,
        };
      }
      return {
        id: current.id,
        uid: current.uid,
        email: current.email,
        name: current.name,
        role: current.role === 'admin' ? 'admin' : 'customer',
        isActive: current.isActive,
      };
    }

    const existingByEmail = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingByEmail[0]) {
      const current = existingByEmail[0];
      if (!current.isActive) return null;
      const [updated] = await db
        .update(users)
        .set({
          uid: decodedToken.uid,
          role: isDesignatedAdmin ? 'admin' : current.role,
          updatedAt: new Date(),
        })
        .where(eq(users.id, current.id))
        .returning();
      return {
        id: updated.id,
        uid: updated.uid,
        email: updated.email,
        name: updated.name,
        role: updated.role === 'admin' ? 'admin' : 'customer',
        isActive: updated.isActive,
      };
    }

    const [created] = await db
      .insert(users)
      .values({
        uid: decodedToken.uid,
        email,
        name: displayName,
        role: isDesignatedAdmin ? 'admin' : 'customer',
      })
      .onConflictDoUpdate({
        target: users.email,
        set: { uid: decodedToken.uid, updatedAt: new Date() },
      })
      .returning();

    return {
      id: created.id,
      uid: created.uid,
      email: created.email,
      name: created.name,
      role: created.role === 'admin' ? 'admin' : 'customer',
      isActive: created.isActive,
    };
  } catch {
    return null;
  }
}

export const authenticateOptional = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) {
      const user = await resolveUserFromToken(token);
      if (user) req.user = user;
    }
  }
  next();
};

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const token = authHeader.slice(7).trim();
  const user = await resolveUserFromToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired session token' });
  }
  req.user = user;
  next();
};

export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Administrator access required' });
  }
  next();
};

export function signJwtToken(user: { id: number; email: string; role: string }): string {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    env.jwtSecret,
    { expiresIn: '7d' }
  );
}
