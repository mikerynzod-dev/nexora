import crypto from 'crypto';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import type { NextFunction, Response } from 'express';
import { db } from '../../db/index.ts';
import {
  cartItems,
  carts,
  coupons,
  couponUsages,
  inventoryLogs,
  orderItems,
  orders,
  payments,
  productImages,
  products,
  productVariants,
  storeSettings,
} from '../../db/schema.ts';
import type { AuthRequest } from '../middleware/auth.ts';
import { AppError } from '../middleware/errorHandler.ts';
import { createOrderSchema } from '../validators/schemas.ts';

function generateOrderNumber(): string {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randPart = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `NX-${datePart}-${randPart}`;
}

export async function createOrder(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError('Authentication required to place an order', 401);
    const data = createOrderSchema.parse(req.body);
    const userId = req.user.id;

    const result = await db.transaction(async (tx) => {
      const [settings] = await tx.select().from(storeSettings).limit(1);
      if (data.paymentMethod === 'COD' && settings && !settings.codEnabled) {
        throw new AppError('Cash on Delivery is currently disabled', 400);
      }
      if (data.paymentMethod === 'Online' && settings && !settings.onlinePaymentEnabled) {
        throw new AppError('Online payment is currently disabled', 400);
      }

      const [userCart] = await tx
        .select()
        .from(carts)
        .where(eq(carts.userId, userId))
        .limit(1);

      if (!userCart) {
        throw new AppError('Your shopping cart is empty', 400);
      }

      const items = await tx
        .select()
        .from(cartItems)
        .where(eq(cartItems.cartId, userCart.id));

      if (items.length === 0) {
        throw new AppError('Your shopping cart is empty', 400);
      }

      let subtotal = 0;
      const preparedItems: Array<{
        productId: number;
        variantId: number | null;
        productNameSnapshot: string;
        variantNameSnapshot: string | null;
        skuSnapshot: string;
        imageUrlSnapshot: string | null;
        unitPrice: number;
        quantity: number;
        lineTotal: number;
        previousProdStock: number;
        previousVarStock: number | null;
      }> = [];

      for (const item of items) {
        const [prod] = await tx
          .select()
          .from(products)
          .where(eq(products.id, item.productId))
          .limit(1);

        if (!prod || prod.status !== 'active') {
          throw new AppError('One or more items in your cart are no longer available', 400);
        }

        let variant = null;
        if (item.variantId) {
          const [v] = await tx
            .select()
            .from(productVariants)
            .where(
              and(
                eq(productVariants.id, item.variantId),
                eq(productVariants.productId, prod.id)
              )
            )
            .limit(1);
          if (!v) throw new AppError(`Variant unavailable for ${prod.name}`, 400);
          variant = v;
        }

        const available = variant ? variant.stock : prod.stock;
        if (available < item.quantity) {
          throw new AppError(
            `Insufficient stock for ${prod.name}${variant ? ` (${variant.name})` : ''}. Available: ${available}`,
            400
          );
        }

        const [primaryImg] = await tx
          .select({ url: productImages.url })
          .from(productImages)
          .where(eq(productImages.productId, prod.id))
          .limit(1);

        const unitPrice = Number(
          (Number(prod.price) + (variant ? Number(variant.priceDelta) : 0)).toFixed(2)
        );
        const lineTotal = Number((unitPrice * item.quantity).toFixed(2));
        subtotal += lineTotal;

        preparedItems.push({
          productId: prod.id,
          variantId: variant ? variant.id : null,
          productNameSnapshot: prod.name,
          variantNameSnapshot: variant ? variant.name : null,
          skuSnapshot: variant ? variant.sku : prod.sku,
          imageUrlSnapshot: primaryImg?.url || null,
          unitPrice,
          quantity: item.quantity,
          lineTotal,
          previousProdStock: prod.stock,
          previousVarStock: variant ? variant.stock : null,
        });
      }

      subtotal = Number(subtotal.toFixed(2));

      // Validate and apply coupon strictly server-side
      let discountAmount = 0;
      let appliedCouponId: number | null = null;
      let appliedCouponCode: string | null = null;

      if (data.couponCode && data.couponCode.trim()) {
        const normalizedCode = data.couponCode.trim().toUpperCase();
        const [coupon] = await tx
          .select()
          .from(coupons)
          .where(eq(coupons.code, normalizedCode))
          .limit(1);

        if (!coupon || !coupon.isActive) {
          throw new AppError('Invalid or inactive coupon code', 400);
        }
        if (coupon.expiresAt && coupon.expiresAt < new Date()) {
          throw new AppError('Coupon code has expired', 400);
        }
        if (coupon.maxUsage !== null && coupon.usedCount >= coupon.maxUsage) {
          throw new AppError('Coupon usage limit reached', 400);
        }
        if (subtotal < Number(coupon.minOrderAmount)) {
          throw new AppError(
            `Minimum order of $${Number(coupon.minOrderAmount).toFixed(2)} required for this coupon`,
            400
          );
        }

        discountAmount =
          coupon.discountType === 'percentage'
            ? Number(((subtotal * Number(coupon.discountValue)) / 100).toFixed(2))
            : Math.min(subtotal, Number(coupon.discountValue));

        appliedCouponId = coupon.id;
        appliedCouponCode = coupon.code;
      }

      const flatFee = settings ? Number(settings.shippingFlatFee) : 15;
      const freeThreshold = settings ? Number(settings.freeShippingThreshold) : 250;
      const shippingFee = subtotal - discountAmount >= freeThreshold ? 0 : flatFee;
      const totalAmount = Number(
        Math.max(0, subtotal - discountAmount + shippingFee).toFixed(2)
      );

      const orderNumber = generateOrderNumber();

      const [createdOrder] = await tx
        .insert(orders)
        .values({
          orderNumber,
          userId,
          status: 'Pending',
          paymentMethod: data.paymentMethod,
          paymentStatus: 'Pending',
          subtotal: subtotal.toFixed(2),
          discountAmount: discountAmount.toFixed(2),
          shippingFee: shippingFee.toFixed(2),
          totalAmount: totalAmount.toFixed(2),
          couponId: appliedCouponId,
          couponCode: appliedCouponCode,
          shippingRecipient: data.shippingRecipient,
          shippingPhone: data.shippingPhone,
          shippingAddress: data.shippingAddress,
          shippingCity: data.shippingCity,
          shippingPostalCode: data.shippingPostalCode,
          notes: data.notes ?? null,
        })
        .returning();

      for (const pItem of preparedItems) {
        await tx.insert(orderItems).values({
          orderId: createdOrder.id,
          productId: pItem.productId,
          variantId: pItem.variantId,
          productNameSnapshot: pItem.productNameSnapshot,
          variantNameSnapshot: pItem.variantNameSnapshot,
          skuSnapshot: pItem.skuSnapshot,
          imageUrlSnapshot: pItem.imageUrlSnapshot,
          unitPriceSnapshot: pItem.unitPrice.toFixed(2),
          quantity: pItem.quantity,
          lineTotal: pItem.lineTotal.toFixed(2),
        });

        // Atomic stock deduction
        const updatedProd = await tx
          .update(products)
          .set({
            stock: sql`${products.stock} - ${pItem.quantity}`,
            updatedAt: new Date(),
          })
          .where(and(eq(products.id, pItem.productId), sql`${products.stock} >= ${pItem.quantity}`))
          .returning({ stock: products.stock });

        if (updatedProd.length === 0) {
          throw new AppError(`Stock changed for ${pItem.productNameSnapshot}. Please retry.`, 409);
        }

        if (pItem.variantId) {
          const updatedVar = await tx
            .update(productVariants)
            .set({ stock: sql`${productVariants.stock} - ${pItem.quantity}` })
            .where(
              and(
                eq(productVariants.id, pItem.variantId),
                sql`${productVariants.stock} >= ${pItem.quantity}`
              )
            )
            .returning({ stock: productVariants.stock });

          if (updatedVar.length === 0) {
            throw new AppError(
              `Variant stock changed for ${pItem.productNameSnapshot}. Please retry.`,
              409
            );
          }
        }

        await tx.insert(inventoryLogs).values({
          productId: pItem.productId,
          variantId: pItem.variantId,
          changeAmount: -pItem.quantity,
          previousStock: pItem.previousProdStock,
          newStock: updatedProd[0].stock,
          reason: `Order ${orderNumber} placed`,
          referenceId: orderNumber,
          actorUserId: userId,
        });
      }

      if (appliedCouponId) {
        await tx
          .update(coupons)
          .set({ usedCount: sql`${coupons.usedCount} + 1`, updatedAt: new Date() })
          .where(eq(coupons.id, appliedCouponId));

        await tx.insert(couponUsages).values({
          couponId: appliedCouponId,
          userId,
          orderId: createdOrder.id,
          discountApplied: discountAmount.toFixed(2),
        });
      }

      // Create initial payment record
      await tx.insert(payments).values({
        orderId: createdOrder.id,
        provider: data.paymentMethod === 'COD' ? 'cod' : 'paymongo',
        amount: totalAmount.toFixed(2),
        currency: 'USD',
        status: 'Pending',
        idempotencyKey: `order-${createdOrder.id}-init`,
      });

      // Clear customer cart
      await tx.delete(cartItems).where(eq(cartItems.cartId, userCart.id));

      return createdOrder;
    });

    res.status(201).json({ order: result });
  } catch (err) {
    next(err);
  }
}

export async function getMyOrders(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError('Authentication required', 401);

    const userOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.userId, req.user.id))
      .orderBy(desc(orders.createdAt));

    if (userOrders.length === 0) {
      return res.json({ orders: [] });
    }

    const orderIds = userOrders.map((o) => o.id);
    const [items, paymentRows] = await Promise.all([
      db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds)),
      db.select().from(payments).where(inArray(payments.orderId, orderIds)),
    ]);

    const enriched = userOrders.map((o) => ({
      ...o,
      subtotal: Number(o.subtotal),
      discountAmount: Number(o.discountAmount),
      shippingFee: Number(o.shippingFee),
      totalAmount: Number(o.totalAmount),
      items: items
        .filter((i) => i.orderId === o.id)
        .map((i) => ({
          ...i,
          unitPriceSnapshot: Number(i.unitPriceSnapshot),
          lineTotal: Number(i.lineTotal),
        })),
      payment: paymentRows.find((p) => p.orderId === o.id) || null,
    }));

    res.json({ orders: enriched });
  } catch (err) {
    next(err);
  }
}

export async function getOrderDetail(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError('Authentication required', 401);
    const param = req.params.id;
    const numericId = Number(param);

    const [order] = await db
      .select()
      .from(orders)
      .where(
        Number.isInteger(numericId) && numericId > 0
          ? eq(orders.id, numericId)
          : eq(orders.orderNumber, param)
      )
      .limit(1);

    if (!order) throw new AppError('Order not found', 404);
    if (order.userId !== req.user.id && req.user.role !== 'admin') {
      throw new AppError('Access denied to this order', 403);
    }

    const [items, paymentRows] = await Promise.all([
      db.select().from(orderItems).where(eq(orderItems.orderId, order.id)),
      db.select().from(payments).where(eq(payments.orderId, order.id)),
    ]);

    res.json({
      order: {
        ...order,
        subtotal: Number(order.subtotal),
        discountAmount: Number(order.discountAmount),
        shippingFee: Number(order.shippingFee),
        totalAmount: Number(order.totalAmount),
        items: items.map((i) => ({
          ...i,
          unitPriceSnapshot: Number(i.unitPriceSnapshot),
          lineTotal: Number(i.lineTotal),
        })),
        payment: paymentRows[0] || null,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function cancelMyOrder(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError('Authentication required', 401);
    const orderId = Number(req.params.id);
    if (!Number.isInteger(orderId) || orderId <= 0) throw new AppError('Invalid order ID', 400);

    const updatedOrder = await db.transaction(async (tx) => {
      const [order] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);

      if (!order) throw new AppError('Order not found', 404);
      if (order.userId !== req.user!.id && req.user!.role !== 'admin') {
        throw new AppError('Unauthorized to cancel this order', 403);
      }

      if (!['Pending', 'Confirmed'].includes(order.status)) {
        throw new AppError(
          `Orders in "${order.status}" stage cannot be cancelled directly`,
          400
        );
      }

      const items = await tx
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id));

      for (const item of items) {
        if (item.productId) {
          const [prod] = await tx
            .select()
            .from(products)
            .where(eq(products.id, item.productId))
            .limit(1);

          if (prod) {
            const newStock = prod.stock + item.quantity;
            await tx
              .update(products)
              .set({ stock: newStock, updatedAt: new Date() })
              .where(eq(products.id, prod.id));

            if (item.variantId) {
              await tx
                .update(productVariants)
                .set({ stock: sql`${productVariants.stock} + ${item.quantity}` })
                .where(eq(productVariants.id, item.variantId));
            }

            await tx.insert(inventoryLogs).values({
              productId: prod.id,
              variantId: item.variantId,
              changeAmount: item.quantity,
              previousStock: prod.stock,
              newStock,
              reason: `Stock restored on cancellation of ${order.orderNumber}`,
              referenceId: order.orderNumber,
              actorUserId: req.user!.id,
            });
          }
        }
      }

      const [updated] = await tx
        .update(orders)
        .set({
          status: 'Cancelled',
          paymentStatus: order.paymentStatus === 'Paid' ? 'Refunded' : order.paymentStatus,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, order.id))
        .returning();

      return updated;
    });

    res.json({ order: updatedOrder });
  } catch (err) {
    next(err);
  }
}
