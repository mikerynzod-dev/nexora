import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import type { NextFunction, Response } from 'express';
import { db } from '../../db/index.ts';
import { users } from '../../db/schema.ts';
import { env } from '../config/env.ts';
import { type AuthRequest, signJwtToken } from '../middleware/auth.ts';
import { AppError } from '../middleware/errorHandler.ts';
import { ensureSeeded } from '../services/seedService.ts';
import {
  changePasswordSchema,
  claimAdminSchema,
  loginSchema,
  registerSchema,
  updateProfileSchema,
} from '../validators/schemas.ts';

export async function registerCustomer(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await ensureSeeded();
    const data = registerSchema.parse(req.body);

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, data.email))
      .limit(1);

    if (existing[0]) {
      throw new AppError('An account with this email already exists', 409);
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const [created] = await db
      .insert(users)
      .values({
        email: data.email,
        name: data.name,
        phone: data.phone || null,
        passwordHash,
        role: 'customer',
      })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        phone: users.phone,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      });

    const token = signJwtToken({ id: created.id, email: created.email, role: created.role });
    res.status(201).json({ user: created, token });
  } catch (err) {
    next(err);
  }
}

export async function loginUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await ensureSeeded();
    const data = loginSchema.parse(req.body);

    // Check env-configured admin override
    if (env.adminEmail && env.adminPassword && data.email === env.adminEmail) {
      if (data.password !== env.adminPassword) {
        throw new AppError('Invalid email or password', 401);
      }
      let [adminUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, env.adminEmail))
        .limit(1);

      if (!adminUser) {
        const hash = await bcrypt.hash(env.adminPassword, 12);
        [adminUser] = await db
          .insert(users)
          .values({
            email: env.adminEmail,
            name: 'NEXORA Administrator',
            passwordHash: hash,
            role: 'admin',
          })
          .returning();
      } else if (adminUser.role !== 'admin') {
        [adminUser] = await db
          .update(users)
          .set({ role: 'admin', updatedAt: new Date() })
          .where(eq(users.id, adminUser.id))
          .returning();
      }

      const token = signJwtToken({ id: adminUser.id, email: adminUser.email, role: 'admin' });
      return res.json({
        user: {
          id: adminUser.id,
          email: adminUser.email,
          name: adminUser.name,
          phone: adminUser.phone,
          role: 'admin',
        },
        token,
      });
    }

    const [found] = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email))
      .limit(1);

    if (!found || !found.passwordHash) {
      throw new AppError('Invalid email or password', 401);
    }

    if (!found.isActive) {
      throw new AppError('Account has been suspended. Contact support.', 403);
    }

    const valid = await bcrypt.compare(data.password, found.passwordHash);
    if (!valid) {
      throw new AppError('Invalid email or password', 401);
    }

    const token = signJwtToken({ id: found.id, email: found.email, role: found.role });
    res.json({
      user: {
        id: found.id,
        email: found.email,
        name: found.name,
        phone: found.phone,
        role: found.role,
      },
      token,
    });
  } catch (err) {
    next(err);
  }
}

export async function getAdminSetupStatus(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await ensureSeeded();
    const envConfigured = Boolean(env.adminEmail && env.adminPassword);
    const existingAdmins = await db
      .select({ id: users.id, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.role, 'admin'));

    const hasClaimedPasswordAdmin = existingAdmins.some((a) => Boolean(a.passwordHash));
    res.json({
      canClaimInitialAdmin: !envConfigured && !hasClaimedPasswordAdmin,
    });
  } catch (err) {
    next(err);
  }
}

export async function claimInitialAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await ensureSeeded();
    if (env.adminEmail && env.adminPassword) {
      throw new AppError('Admin credentials are already configured in environment settings', 403);
    }

    const data = claimAdminSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(data.password, 12);

    const adminUser = await db.transaction(async (tx) => {
      const existingAdmins = await tx
        .select({ id: users.id, passwordHash: users.passwordHash })
        .from(users)
        .where(eq(users.role, 'admin'));

      if (existingAdmins.some((a) => Boolean(a.passwordHash))) {
        throw new AppError('Initial administrator account has already been claimed', 409);
      }

      const [existingEmail] = await tx
        .select()
        .from(users)
        .where(eq(users.email, data.email))
        .limit(1);

      if (existingEmail) {
        const [updated] = await tx
          .update(users)
          .set({
            name: data.name,
            passwordHash,
            role: 'admin',
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingEmail.id))
          .returning();
        return updated;
      }

      const [created] = await tx
        .insert(users)
        .values({
          email: data.email,
          name: data.name,
          passwordHash,
          role: 'admin',
        })
        .returning();
      return created;
    });

    const token = signJwtToken({ id: adminUser.id, email: adminUser.email, role: 'admin' });
    res.status(201).json({
      user: {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        phone: adminUser.phone,
        role: 'admin',
      },
      token,
    });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }
    const [fullUser] = await db
      .select({
        id: users.id,
        uid: users.uid,
        email: users.email,
        name: users.name,
        phone: users.phone,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
        hasPassword: users.passwordHash,
      })
      .from(users)
      .where(eq(users.id, req.user.id))
      .limit(1);

    if (!fullUser) {
      throw new AppError('User not found', 404);
    }

    res.json({
      user: {
        id: fullUser.id,
        uid: fullUser.uid,
        email: fullUser.email,
        name: fullUser.name,
        phone: fullUser.phone,
        role: fullUser.role,
        isActive: fullUser.isActive,
        createdAt: fullUser.createdAt,
        hasPassword: Boolean(fullUser.hasPassword),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError('Authentication required', 401);
    const data = updateProfileSchema.parse(req.body);

    const [updated] = await db
      .update(users)
      .set({
        name: data.name,
        phone: data.phone ?? null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, req.user.id))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        phone: users.phone,
        role: users.role,
      });

    res.json({ user: updated });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError('Authentication required', 401);
    const data = changePasswordSchema.parse(req.body);

    const [found] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user.id))
      .limit(1);

    if (!found) throw new AppError('User not found', 404);

    if (found.passwordHash) {
      const valid = await bcrypt.compare(data.currentPassword, found.passwordHash);
      if (!valid) throw new AppError('Current password is incorrect', 400);
    }

    const newHash = await bcrypt.hash(data.newPassword, 12);
    await db
      .update(users)
      .set({ passwordHash: newHash, updatedAt: new Date() })
      .where(eq(users.id, found.id));

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
}

export async function logoutUser(_req: AuthRequest, res: Response) {
  res.json({ message: 'Signed out' });
}
