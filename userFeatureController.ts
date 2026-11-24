import { and, desc, eq, inArray, ne } from 'drizzle-orm';
import type { NextFunction, Response } from 'express';
import { z } from 'zod';
import { db } from '../../db/index.ts';
import {
  addresses,
  newsletterSubscribers,
  orderItems,
  orders,
  productImages,
  products,
  reviews,
  users,
  wishlists,
} from '../../db/schema.ts';
import type { AuthRequest } from '../middleware/auth.ts';
import { AppError } from '../middleware/errorHandler.ts';
import { addressSchema, reviewSchema } from '../validators/schemas.ts';

export async function getWishlist(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError('Authentication required', 401);

    const rows = await db
      .select()
      .from(wishlists)
      .where(eq(wishlists.userId, req.user.id))
      .orderBy(desc(wishlists.createdAt));

    if (rows.length === 0) return res.json({ items: [] });

    const productIds = rows.map((r) => r.productId);
    const [prodRows, imgRows] = await Promise.all([
      db.select().from(products).where(inArray(products.id, productIds)),
      db.select().from(productImages).where(inArray(productImages.productId, productIds)),
    ]);

    const prodMap = new Map(prodRows.map((p) => [p.id, p]));
    const items = rows
      .map((w) => {
        const prod = prodMap.get(w.productId);
        if (!prod) return null;
        return {
          id: w.id,
          productId: prod.id,
          createdAt: w.createdAt,
          product: {
            ...prod,
            price: Number(prod.price),
            compareAtPrice: prod.compareAtPrice ? Number(prod.compareAtPrice) : null,
            ratingAvg: Number(prod.ratingAvg),
            images: imgRows.filter((img) => img.productId === prod.id),
          },
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    res.json({ items });
  } catch (err) {
    next(err);
  }
}

export async function addToWishlist(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError('Authentication required', 401);
    const productId = Number(req.body?.productId);
    if (!Number.isInteger(productId) || productId <= 0) {
      throw new AppError('Valid productId is required', 400);
    }

    const [prod] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);
    if (!prod) throw new AppError('Product not found', 404);

    const [existing] = await db
      .select()
      .from(wishlists)
      .where(and(eq(wishlists.userId, req.user.id), eq(wishlists.productId, productId)))
      .limit(1);

    if (existing) {
      return res.json({ item: existing, alreadySaved: true });
    }

    const [created] = await db
      .insert(wishlists)
      .values({ userId: req.user.id, productId })
      .returning();

    res.status(201).json({ item: created });
  } catch (err) {
    next(err);
  }
}

export async function removeFromWishlist(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError('Authentication required', 401);
    const idParam = Number(req.params.id);
    if (!Number.isInteger(idParam) || idParam <= 0) {
      throw new AppError('Invalid wishlist/product ID', 400);
    }

    // Allow removing by wishlist row id or productId for convenience
    await db
      .delete(wishlists)
      .where(
        and(eq(wishlists.userId, req.user.id), eq(wishlists.id, idParam))
      );
    await db
      .delete(wishlists)
      .where(
        and(eq(wishlists.userId, req.user.id), eq(wishlists.productId, idParam))
      );

    res.json({ message: 'Removed from wishlist' });
  } catch (err) {
    next(err);
  }
}

export async function getProductReviews(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const productId = Number(req.params.id);
    if (!Number.isInteger(productId) || productId <= 0) {
      throw new AppError('Invalid product ID', 400);
    }

    const rows = await db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        title: reviews.title,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        userName: users.name,
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .where(eq(reviews.productId, productId))
      .orderBy(desc(reviews.createdAt));

    res.json({ reviews: rows });
  } catch (err) {
    next(err);
  }
}

export async function createReview(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError('Authentication required', 401);
    const data = reviewSchema.parse(req.body);
    const userId = req.user.id;

    // Verify customer actually purchased this product in a non-cancelled order
    const purchasedOrders = await db
      .select({ orderId: orders.id })
      .from(orders)
      .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
      .where(
        and(
          eq(orders.userId, userId),
          ne(orders.status, 'Cancelled'),
          eq(orderItems.productId, data.productId)
        )
      )
      .limit(1);

    if (!purchasedOrders[0]) {
      throw new AppError('Only verified purchasers of this product can submit a review', 403);
    }

    const [existingReview] = await db
      .select({ id: reviews.id })
      .from(reviews)
      .where(and(eq(reviews.userId, userId), eq(reviews.productId, data.productId)))
      .limit(1);

    if (existingReview) {
      throw new AppError('You have already reviewed this product', 409);
    }

    const created = await db.transaction(async (tx) => {
      const [rev] = await tx
        .insert(reviews)
        .values({
          userId,
          productId: data.productId,
          orderId: purchasedOrders[0].orderId,
          rating: data.rating,
          title: data.title,
          comment: data.comment,
        })
        .returning();

      const allReviews = await tx
        .select({ rating: reviews.rating })
        .from(reviews)
        .where(eq(reviews.productId, data.productId));

      const totalRatings = allReviews.reduce((sum, r) => sum + r.rating, 0);
      const avg = (totalRatings / allReviews.length).toFixed(2);

      await tx
        .update(products)
        .set({
          ratingAvg: avg,
          reviewCount: allReviews.length,
          updatedAt: new Date(),
        })
        .where(eq(products.id, data.productId));

      return rev;
    });

    res.status(201).json({ review: created });
  } catch (err) {
    next(err);
  }
}

export async function listAddresses(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError('Authentication required', 401);
    const rows = await db
      .select()
      .from(addresses)
      .where(eq(addresses.userId, req.user.id))
      .orderBy(desc(addresses.isDefault), desc(addresses.createdAt));

    res.json({ addresses: rows });
  } catch (err) {
    next(err);
  }
}

export async function createAddress(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError('Authentication required', 401);
    const data = addressSchema.parse(req.body);

    const created = await db.transaction(async (tx) => {
      if (data.isDefault) {
        await tx
          .update(addresses)
          .set({ isDefault: false })
          .where(eq(addresses.userId, req.user!.id));
      }

      const [addr] = await tx
        .insert(addresses)
        .values({
          userId: req.user!.id,
          label: data.label,
          recipientName: data.recipientName,
          phone: data.phone,
          street: data.street,
          city: data.city,
          postalCode: data.postalCode,
          country: data.country,
          isDefault: data.isDefault,
        })
        .returning();
      return addr;
    });

    res.status(201).json({ address: created });
  } catch (err) {
    next(err);
  }
}

export async function deleteAddress(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError('Authentication required', 401);
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) throw new AppError('Invalid address ID', 400);

    await db
      .delete(addresses)
      .where(and(eq(addresses.id, id), eq(addresses.userId, req.user.id)));

    res.json({ message: 'Address deleted' });
  } catch (err) {
    next(err);
  }
}

export async function subscribeNewsletter(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const schema = z.object({ email: z.string().trim().email().toLowerCase() });
    const { email } = schema.parse(req.body);

    await db
      .insert(newsletterSubscribers)
      .values({ email })
      .onConflictDoNothing({ target: newsletterSubscribers.email });

    res.status(201).json({ message: 'Subscribed to NEXORA releases' });
  } catch (err) {
    next(err);
  }
}
