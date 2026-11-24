import { and, eq, inArray, isNull } from 'drizzle-orm';
import type { NextFunction, Response } from 'express';
import { db } from '../../db/index.ts';
import {
  cartItems,
  carts,
  coupons,
  productImages,
  products,
  productVariants,
  storeSettings,
} from '../../db/schema.ts';
import type { AuthRequest } from '../middleware/auth.ts';
import { AppError } from '../middleware/errorHandler.ts';
import { ensureSeeded } from '../services/seedService.ts';
import { addToCartSchema, updateCartItemSchema } from '../validators/schemas.ts';

function getSessionId(req: AuthRequest): string | null {
  const header = req.headers['x-cart-session'];
  if (typeof header === 'string' && header.trim().length >= 8 && header.trim().length <= 100) {
    return header.trim();
  }
  return null;
}

async function resolveOrCreateCart(req: AuthRequest): Promise<{ id: number }> {
  if (req.user) {
    const [existing] = await db
      .select({ id: carts.id })
      .from(carts)
      .where(eq(carts.userId, req.user.id))
      .limit(1);
    if (existing) return existing;

    const [created] = await db
      .insert(carts)
      .values({ userId: req.user.id })
      .returning({ id: carts.id });
    return created;
  }

  const sessionId = getSessionId(req);
  if (!sessionId) {
    throw new AppError('Cart session identifier is required', 400);
  }

  const [existing] = await db
    .select({ id: carts.id })
    .from(carts)
    .where(eq(carts.sessionId, sessionId))
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(carts)
    .values({ sessionId })
    .returning({ id: carts.id });
  return created;
}

async function buildCartResponse(cartId: number) {
  const items = await db
    .select()
    .from(cartItems)
    .where(eq(cartItems.cartId, cartId));

  const [settings] = await db.select().from(storeSettings).limit(1);
  const flatFee = settings ? Number(settings.shippingFlatFee) : 15;
  const freeThreshold = settings ? Number(settings.freeShippingThreshold) : 250;

  if (items.length === 0) {
    return {
      cartId,
      items: [],
      subtotal: 0,
      shippingFee: 0,
      freeShippingThreshold: freeThreshold,
      total: 0,
      itemCount: 0,
    };
  }

  const productIds = [...new Set(items.map((i) => i.productId))];
  const variantIds = items.map((i) => i.variantId).filter((v): v is number => v !== null);

  const [prodRows, imgRows, varRows] = await Promise.all([
    db.select().from(products).where(inArray(products.id, productIds)),
    db.select().from(productImages).where(inArray(productImages.productId, productIds)),
    variantIds.length > 0
      ? db.select().from(productVariants).where(inArray(productVariants.id, variantIds))
      : Promise.resolve([]),
  ]);

  const prodMap = new Map(prodRows.map((p) => [p.id, p]));
  const varMap = new Map(varRows.map((v) => [v.id, v]));

  let subtotal = 0;
  let itemCount = 0;

  const enrichedItems = items
    .map((item) => {
      const prod = prodMap.get(item.productId);
      if (!prod || prod.status !== 'active') return null;

      const variant = item.variantId ? varMap.get(item.variantId) || null : null;
      const unitPrice = Number(prod.price) + (variant ? Number(variant.priceDelta) : 0);
      const lineTotal = Number((unitPrice * item.quantity).toFixed(2));
      const availableStock = variant ? variant.stock : prod.stock;
      const primaryImg =
        imgRows.find((img) => img.productId === prod.id && img.isPrimary)?.url ||
        imgRows.find((img) => img.productId === prod.id)?.url ||
        null;

      subtotal += lineTotal;
      itemCount += item.quantity;

      return {
        id: item.id,
        productId: prod.id,
        slug: prod.slug,
        name: prod.name,
        sku: variant ? variant.sku : prod.sku,
        variantId: variant ? variant.id : null,
        variantName: variant ? variant.name : null,
        unitPrice: Number(unitPrice.toFixed(2)),
        quantity: item.quantity,
        lineTotal,
        availableStock,
        imageUrl: primaryImg,
      };
    })
    .filter((i): i is NonNullable<typeof i> => i !== null);

  subtotal = Number(subtotal.toFixed(2));
  const shippingFee = subtotal === 0 || subtotal >= freeThreshold ? 0 : flatFee;
  const total = Number((subtotal + shippingFee).toFixed(2));

  return {
    cartId,
    items: enrichedItems,
    subtotal,
    shippingFee,
    freeShippingThreshold: freeThreshold,
    total,
    itemCount,
  };
}

export async function getCart(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await ensureSeeded();
    if (!req.user && !getSessionId(req)) {
      const [settings] = await db.select().from(storeSettings).limit(1);
      return res.json({
        cartId: null,
        items: [],
        subtotal: 0,
        shippingFee: 0,
        freeShippingThreshold: settings ? Number(settings.freeShippingThreshold) : 250,
        total: 0,
        itemCount: 0,
      });
    }
    const cart = await resolveOrCreateCart(req);
    const data = await buildCartResponse(cart.id);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function addCartItem(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await ensureSeeded();
    const data = addToCartSchema.parse(req.body);
    const cart = await resolveOrCreateCart(req);

    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, data.productId), eq(products.status, 'active')))
      .limit(1);

    if (!product) throw new AppError('Product not available', 404);

    let maxStock = product.stock;
    if (data.variantId) {
      const [variant] = await db
        .select()
        .from(productVariants)
        .where(
          and(
            eq(productVariants.id, data.variantId),
            eq(productVariants.productId, data.productId)
          )
        )
        .limit(1);
      if (!variant) throw new AppError('Selected variant not found', 404);
      maxStock = variant.stock;
    }

    if (maxStock <= 0) {
      throw new AppError('This item is currently out of stock', 400);
    }

    const existingCondition = data.variantId
      ? and(
          eq(cartItems.cartId, cart.id),
          eq(cartItems.productId, data.productId),
          eq(cartItems.variantId, data.variantId)
        )
      : and(
          eq(cartItems.cartId, cart.id),
          eq(cartItems.productId, data.productId),
          isNull(cartItems.variantId)
        );

    const [existingItem] = await db.select().from(cartItems).where(existingCondition).limit(1);

    if (existingItem) {
      const nextQty = Math.min(maxStock, existingItem.quantity + data.quantity);
      await db
        .update(cartItems)
        .set({ quantity: nextQty, updatedAt: new Date() })
        .where(eq(cartItems.id, existingItem.id));
    } else {
      const initialQty = Math.min(maxStock, data.quantity);
      await db.insert(cartItems).values({
        cartId: cart.id,
        productId: data.productId,
        variantId: data.variantId ?? null,
        quantity: initialQty,
      });
    }

    const updatedCart = await buildCartResponse(cart.id);
    res.status(201).json(updatedCart);
  } catch (err) {
    next(err);
  }
}

export async function updateCartItem(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const itemId = Number(req.params.id);
    if (!Number.isInteger(itemId) || itemId <= 0) throw new AppError('Invalid cart item ID', 400);
    const data = updateCartItemSchema.parse(req.body);
    const cart = await resolveOrCreateCart(req);

    const [item] = await db
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cart.id)))
      .limit(1);

    if (!item) throw new AppError('Cart item not found', 404);

    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, item.productId))
      .limit(1);
    if (!product) throw new AppError('Product not found', 404);

    let maxStock = product.stock;
    if (item.variantId) {
      const [variant] = await db
        .select()
        .from(productVariants)
        .where(eq(productVariants.id, item.variantId))
        .limit(1);
      if (variant) maxStock = variant.stock;
    }

    if (data.quantity > maxStock) {
      throw new AppError(`Only ${maxStock} units available in stock`, 400);
    }

    await db
      .update(cartItems)
      .set({ quantity: data.quantity, updatedAt: new Date() })
      .where(eq(cartItems.id, itemId));

    const updatedCart = await buildCartResponse(cart.id);
    res.json(updatedCart);
  } catch (err) {
    next(err);
  }
}

export async function removeCartItem(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const itemId = Number(req.params.id);
    if (!Number.isInteger(itemId) || itemId <= 0) throw new AppError('Invalid cart item ID', 400);
    const cart = await resolveOrCreateCart(req);

    await db
      .delete(cartItems)
      .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cart.id)));

    const updatedCart = await buildCartResponse(cart.id);
    res.json(updatedCart);
  } catch (err) {
    next(err);
  }
}

export async function mergeGuestCart(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError('Authentication required', 401);
    const sessionId = getSessionId(req);
    if (!sessionId) {
      const userCart = await resolveOrCreateCart(req);
      return res.json(await buildCartResponse(userCart.id));
    }

    const [guestCart] = await db
      .select()
      .from(carts)
      .where(eq(carts.sessionId, sessionId))
      .limit(1);

    const userCart = await resolveOrCreateCart(req);

    if (guestCart && guestCart.id !== userCart.id) {
      const guestItems = await db
        .select()
        .from(cartItems)
        .where(eq(cartItems.cartId, guestCart.id));

      for (const gItem of guestItems) {
        const cond = gItem.variantId
          ? and(
              eq(cartItems.cartId, userCart.id),
              eq(cartItems.productId, gItem.productId),
              eq(cartItems.variantId, gItem.variantId)
            )
          : and(
              eq(cartItems.cartId, userCart.id),
              eq(cartItems.productId, gItem.productId),
              isNull(cartItems.variantId)
            );

        const [existing] = await db.select().from(cartItems).where(cond).limit(1);
        if (existing) {
          await db
            .update(cartItems)
            .set({ quantity: existing.quantity + gItem.quantity, updatedAt: new Date() })
            .where(eq(cartItems.id, existing.id));
        } else {
          await db.insert(cartItems).values({
            cartId: userCart.id,
            productId: gItem.productId,
            variantId: gItem.variantId,
            quantity: gItem.quantity,
          });
        }
      }

      await db.delete(carts).where(eq(carts.id, guestCart.id));
    }

    res.json(await buildCartResponse(userCart.id));
  } catch (err) {
    next(err);
  }
}

export async function validateCoupon(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const code = typeof req.body?.code === 'string' ? req.body.code.trim().toUpperCase() : '';
    const subtotal = Number(req.body?.subtotal || 0);
    if (!code) throw new AppError('Coupon code is required', 400);

    const [coupon] = await db
      .select()
      .from(coupons)
      .where(eq(coupons.code, code))
      .limit(1);

    if (!coupon || !coupon.isActive) {
      throw new AppError('Invalid or inactive coupon code', 404);
    }

    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      throw new AppError('This coupon code has expired', 400);
    }

    if (coupon.maxUsage !== null && coupon.usedCount >= coupon.maxUsage) {
      throw new AppError('This coupon has reached its usage limit', 400);
    }

    if (subtotal < Number(coupon.minOrderAmount)) {
      throw new AppError(
        `Minimum order subtotal of $${Number(coupon.minOrderAmount).toFixed(2)} required`,
        400
      );
    }

    const discountAmount =
      coupon.discountType === 'percentage'
        ? Number(((subtotal * Number(coupon.discountValue)) / 100).toFixed(2))
        : Math.min(subtotal, Number(coupon.discountValue));

    res.json({
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: Number(coupon.discountValue),
        discountAmount,
      },
    });
  } catch (err) {
    next(err);
  }
}
