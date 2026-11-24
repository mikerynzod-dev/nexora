import { and, asc, count, desc, eq, inArray, lte, ne, sql } from 'drizzle-orm';
import type { NextFunction, Response } from 'express';
import { db } from '../../db/index.ts';
import {
  categories,
  coupons,
  inventoryLogs,
  orderItems,
  orders,
  payments,
  productImages,
  products,
  productVariants,
  storeSettings,
  users,
} from '../../db/schema.ts';
import type { AuthRequest } from '../middleware/auth.ts';
import { AppError } from '../middleware/errorHandler.ts';
import { ensureSeeded } from '../services/seedService.ts';
import {
  adjustInventorySchema,
  couponSchema,
  storeSettingsSchema,
  updateOrderStatusSchema,
} from '../validators/schemas.ts';

export async function getAdminDashboard(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await ensureSeeded();

    const [
      revenueRows,
      orderCounts,
      customerCountRow,
      productCountRow,
      pendingCountRow,
      completedCountRow,
      recentOrderRows,
      lowStockProducts,
      allOrderItems,
    ] = await Promise.all([
      db
        .select({
          total: sql<string>`COALESCE(SUM(${orders.totalAmount}), 0)`,
        })
        .from(orders)
        .where(ne(orders.status, 'Cancelled')),
      db.select({ value: count() }).from(orders),
      db.select({ value: count() }).from(users).where(eq(users.role, 'customer')),
      db.select({ value: count() }).from(products).where(ne(products.status, 'archived')),
      db.select({ value: count() }).from(orders).where(eq(orders.status, 'Pending')),
      db.select({ value: count() }).from(orders).where(eq(orders.status, 'Delivered')),
      db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          status: orders.status,
          paymentMethod: orders.paymentMethod,
          paymentStatus: orders.paymentStatus,
          totalAmount: orders.totalAmount,
          shippingRecipient: orders.shippingRecipient,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .orderBy(desc(orders.createdAt))
        .limit(8),
      db
        .select({
          id: products.id,
          name: products.name,
          sku: products.sku,
          stock: products.stock,
          price: products.price,
        })
        .from(products)
        .where(and(eq(products.status, 'active'), lte(products.stock, 10)))
        .orderBy(asc(products.stock))
        .limit(10),
      db
        .select({
          productId: orderItems.productId,
          name: orderItems.productNameSnapshot,
          quantity: orderItems.quantity,
          lineTotal: orderItems.lineTotal,
        })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(ne(orders.status, 'Cancelled')),
    ]);

    const bestSellerMap = new Map<
      string,
      { productId: number | null; name: string; unitsSold: number; revenue: number }
    >();

    for (const item of allOrderItems) {
      const key = item.productId ? String(item.productId) : item.name;
      const existing = bestSellerMap.get(key) || {
        productId: item.productId,
        name: item.name,
        unitsSold: 0,
        revenue: 0,
      };
      existing.unitsSold += item.quantity;
      existing.revenue = Number((existing.revenue + Number(item.lineTotal)).toFixed(2));
      bestSellerMap.set(key, existing);
    }

    const bestSellingProducts = Array.from(bestSellerMap.values())
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, 6);

    // 7-day daily sales series for quick dashboard chart
    const dailySales = await db.execute(sql`
      SELECT
        TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD') AS day,
        COALESCE(SUM(total_amount), 0)::numeric(12,2) AS revenue,
        COUNT(*)::int AS orders
      FROM orders
      WHERE status <> 'Cancelled'
        AND created_at >= NOW() - INTERVAL '14 days'
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY DATE_TRUNC('day', created_at) ASC
    `);

    res.json({
      kpis: {
        totalRevenue: Number(revenueRows[0]?.total || 0),
        totalOrders: Number(orderCounts[0]?.value || 0),
        totalCustomers: Number(customerCountRow[0]?.value || 0),
        totalProducts: Number(productCountRow[0]?.value || 0),
        pendingOrders: Number(pendingCountRow[0]?.value || 0),
        completedOrders: Number(completedCountRow[0]?.value || 0),
      },
      recentOrders: recentOrderRows.map((o) => ({ ...o, totalAmount: Number(o.totalAmount) })),
      lowStockAlerts: lowStockProducts.map((p) => ({ ...p, price: Number(p.price) })),
      bestSellingProducts,
      salesChart: dailySales.rows.map((r) => ({
        day: String(r.day),
        revenue: Number(r.revenue),
        orders: Number(r.orders),
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function listAllOrders(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const statusFilter = typeof req.query.status === 'string' ? req.query.status : 'all';

    const orderRows =
      statusFilter !== 'all'
        ? await db
            .select()
            .from(orders)
            .where(eq(orders.status, statusFilter))
            .orderBy(desc(orders.createdAt))
        : await db.select().from(orders).orderBy(desc(orders.createdAt));

    if (orderRows.length === 0) return res.json({ orders: [] });

    const orderIds = orderRows.map((o) => o.id);
    const userIds = [...new Set(orderRows.map((o) => o.userId))];

    const [items, userRows, paymentRows] = await Promise.all([
      db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds)),
      db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(inArray(users.id, userIds)),
      db.select().from(payments).where(inArray(payments.orderId, orderIds)),
    ]);

    const userMap = new Map(userRows.map((u) => [u.id, u]));

    res.json({
      orders: orderRows.map((o) => ({
        ...o,
        subtotal: Number(o.subtotal),
        discountAmount: Number(o.discountAmount),
        shippingFee: Number(o.shippingFee),
        totalAmount: Number(o.totalAmount),
        customer: userMap.get(o.userId) || null,
        items: items
          .filter((i) => i.orderId === o.id)
          .map((i) => ({
            ...i,
            unitPriceSnapshot: Number(i.unitPriceSnapshot),
            lineTotal: Number(i.lineTotal),
          })),
        payment: paymentRows.find((p) => p.orderId === o.id) || null,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function updateOrderStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const orderId = Number(req.params.id);
    if (!Number.isInteger(orderId) || orderId <= 0) throw new AppError('Invalid order ID', 400);
    const data = updateOrderStatusSchema.parse(req.body);

    const updated = await db.transaction(async (tx) => {
      const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
      if (!order) throw new AppError('Order not found', 404);

      if (order.status === 'Cancelled' && data.status !== 'Cancelled') {
        throw new AppError('Cancelled orders cannot be reopened', 400);
      }

      // Restore inventory if transitioning into Cancelled from a non-cancelled state
      if (data.status === 'Cancelled' && order.status !== 'Cancelled') {
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
                reason: `Admin cancelled order ${order.orderNumber}`,
                referenceId: order.orderNumber,
                actorUserId: req.user?.id ?? null,
              });
            }
          }
        }
      }

      // For Cash on Delivery, marking as Delivered also settles payment
      let nextPaymentStatus = order.paymentStatus;
      if (data.status === 'Delivered' && order.paymentMethod === 'COD' && order.paymentStatus === 'Pending') {
        nextPaymentStatus = 'Paid';
        await tx
          .update(payments)
          .set({ status: 'Paid', updatedAt: new Date() })
          .where(eq(payments.orderId, order.id));
      } else if (data.status === 'Cancelled' && order.paymentStatus === 'Paid') {
        nextPaymentStatus = 'Refunded';
        await tx
          .update(payments)
          .set({ status: 'Refunded', updatedAt: new Date() })
          .where(eq(payments.orderId, order.id));
      }

      const [resOrder] = await tx
        .update(orders)
        .set({
          status: data.status,
          paymentStatus: nextPaymentStatus,
          trackingNumber:
            data.trackingNumber !== undefined ? data.trackingNumber : order.trackingNumber,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, order.id))
        .returning();

      return resOrder;
    });

    res.json({ order: updated });
  } catch (err) {
    next(err);
  }
}

export async function listCustomers(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const customerRows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    const orderStats = await db
      .select({
        userId: orders.userId,
        orderCount: count(),
        totalSpent: sql<string>`COALESCE(SUM(${orders.totalAmount}), 0)`,
      })
      .from(orders)
      .where(ne(orders.status, 'Cancelled'))
      .groupBy(orders.userId);

    const statsMap = new Map(orderStats.map((s) => [s.userId, s]));

    res.json({
      customers: customerRows.map((c) => {
        const st = statsMap.get(c.id);
        return {
          ...c,
          orderCount: st ? Number(st.orderCount) : 0,
          totalSpent: st ? Number(st.totalSpent) : 0,
        };
      }),
    });
  } catch (err) {
    next(err);
  }
}

export async function getCustomerDetails(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) throw new AppError('Invalid customer ID', 400);

    const [customer] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!customer) throw new AppError('Customer not found', 404);

    const customerOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.userId, id))
      .orderBy(desc(orders.createdAt));

    res.json({
      customer,
      orders: customerOrders.map((o) => ({ ...o, totalAmount: Number(o.totalAmount) })),
    });
  } catch (err) {
    next(err);
  }
}

export async function toggleCustomerStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) throw new AppError('Invalid customer ID', 400);
    if (req.user?.id === id) throw new AppError('Cannot deactivate your own admin account', 400);

    const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!target) throw new AppError('User not found', 404);

    const [updated] = await db
      .update(users)
      .set({ isActive: !target.isActive, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
      });

    res.json({ customer: updated });
  } catch (err) {
    next(err);
  }
}

export async function getInventoryOverview(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const [prodRows, catRows, varRows, logRows] = await Promise.all([
      db.select().from(products).orderBy(asc(products.stock)),
      db.select().from(categories),
      db.select().from(productVariants),
      db
        .select({
          id: inventoryLogs.id,
          productId: inventoryLogs.productId,
          productName: products.name,
          changeAmount: inventoryLogs.changeAmount,
          previousStock: inventoryLogs.previousStock,
          newStock: inventoryLogs.newStock,
          reason: inventoryLogs.reason,
          referenceId: inventoryLogs.referenceId,
          createdAt: inventoryLogs.createdAt,
        })
        .from(inventoryLogs)
        .innerJoin(products, eq(inventoryLogs.productId, products.id))
        .orderBy(desc(inventoryLogs.createdAt))
        .limit(40),
    ]);

    const catMap = new Map(catRows.map((c) => [c.id, c.name]));

    res.json({
      inventory: prodRows.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        categoryName: catMap.get(p.categoryId) || 'Uncategorized',
        stock: p.stock,
        price: Number(p.price),
        status: p.status,
        variants: varRows
          .filter((v) => v.productId === p.id)
          .map((v) => ({ id: v.id, name: v.name, sku: v.sku, stock: v.stock })),
      })),
      logs: logRows,
    });
  } catch (err) {
    next(err);
  }
}

export async function adjustInventory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = adjustInventorySchema.parse(req.body);

    const updated = await db.transaction(async (tx) => {
      const [prod] = await tx
        .select()
        .from(products)
        .where(eq(products.id, data.productId))
        .limit(1);

      if (!prod) throw new AppError('Product not found', 404);

      const newStock = prod.stock + data.changeAmount;
      if (newStock < 0) {
        throw new AppError('Stock level cannot become negative', 400);
      }

      const [updatedProd] = await tx
        .update(products)
        .set({ stock: newStock, updatedAt: new Date() })
        .where(eq(products.id, prod.id))
        .returning();

      if (data.variantId) {
        const [v] = await tx
          .select()
          .from(productVariants)
          .where(eq(productVariants.id, data.variantId))
          .limit(1);
        if (v) {
          const nextVarStock = Math.max(0, v.stock + data.changeAmount);
          await tx
            .update(productVariants)
            .set({ stock: nextVarStock })
            .where(eq(productVariants.id, v.id));
        }
      }

      await tx.insert(inventoryLogs).values({
        productId: prod.id,
        variantId: data.variantId ?? null,
        changeAmount: data.changeAmount,
        previousStock: prod.stock,
        newStock,
        reason: data.reason,
        actorUserId: req.user?.id ?? null,
      });

      return updatedProd;
    });

    res.json({ product: updated });
  } catch (err) {
    next(err);
  }
}

export async function listCoupons(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const rows = await db.select().from(coupons).orderBy(desc(coupons.createdAt));
    res.json({
      coupons: rows.map((c) => ({
        ...c,
        discountValue: Number(c.discountValue),
        minOrderAmount: Number(c.minOrderAmount),
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function createCoupon(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = couponSchema.parse(req.body);
    const [created] = await db
      .insert(coupons)
      .values({
        code: data.code,
        discountType: data.discountType,
        discountValue: data.discountValue.toFixed(2),
        minOrderAmount: data.minOrderAmount.toFixed(2),
        maxUsage: data.maxUsage ?? null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        isActive: data.isActive,
      })
      .returning();

    res.status(201).json({ coupon: created });
  } catch (err) {
    next(err);
  }
}

export async function toggleCouponStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) throw new AppError('Invalid coupon ID', 400);

    const [existing] = await db.select().from(coupons).where(eq(coupons.id, id)).limit(1);
    if (!existing) throw new AppError('Coupon not found', 404);

    const [updated] = await db
      .update(coupons)
      .set({ isActive: !existing.isActive, updatedAt: new Date() })
      .where(eq(coupons.id, id))
      .returning();

    res.json({ coupon: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteCoupon(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) throw new AppError('Invalid coupon ID', 400);
    await db.delete(coupons).where(eq(coupons.id, id));
    res.json({ message: 'Coupon deleted' });
  } catch (err) {
    next(err);
  }
}

export async function getAdminReports(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const period = typeof req.query.period === 'string' ? req.query.period : 'daily';

    const [daily, monthly, yearly, productPerf, customerStats] = await Promise.all([
      db.execute(sql`
        SELECT
          TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD') AS label,
          COALESCE(SUM(total_amount), 0)::numeric(12,2) AS revenue,
          COUNT(*)::int AS orders
        FROM orders
        WHERE status <> 'Cancelled' AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY DATE_TRUNC('day', created_at) ASC
      `),
      db.execute(sql`
        SELECT
          TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS label,
          COALESCE(SUM(total_amount), 0)::numeric(12,2) AS revenue,
          COUNT(*)::int AS orders
        FROM orders
        WHERE status <> 'Cancelled' AND created_at >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY DATE_TRUNC('month', created_at) ASC
      `),
      db.execute(sql`
        SELECT
          TO_CHAR(DATE_TRUNC('year', created_at), 'YYYY') AS label,
          COALESCE(SUM(total_amount), 0)::numeric(12,2) AS revenue,
          COUNT(*)::int AS orders
        FROM orders
        WHERE status <> 'Cancelled'
        GROUP BY DATE_TRUNC('year', created_at)
        ORDER BY DATE_TRUNC('year', created_at) ASC
      `),
      db.execute(sql`
        SELECT
          oi.product_name_snapshot AS name,
          SUM(oi.quantity)::int AS units,
          COALESCE(SUM(oi.line_total), 0)::numeric(12,2) AS revenue
        FROM order_items oi
        INNER JOIN orders o ON o.id = oi.order_id
        WHERE o.status <> 'Cancelled'
        GROUP BY oi.product_name_snapshot
        ORDER BY revenue DESC
        LIMIT 10
      `),
      db.execute(sql`
        SELECT
          COUNT(*) FILTER (WHERE role = 'customer')::int AS total_customers,
          COUNT(*) FILTER (WHERE role = 'customer' AND is_active = true)::int AS active_customers,
          (SELECT COUNT(DISTINCT user_id)::int FROM orders WHERE status <> 'Cancelled') AS purchasing_customers,
          (SELECT COALESCE(AVG(total_amount), 0)::numeric(12,2) FROM orders WHERE status <> 'Cancelled') AS avg_order_value
        FROM users
      `),
    ]);

    const formatRows = (rows: Array<Record<string, unknown>>) =>
      rows.map((r) => ({
        label: String(r.label),
        revenue: Number(r.revenue),
        orders: Number(r.orders),
      }));

    res.json({
      period,
      series: {
        daily: formatRows(daily.rows),
        monthly: formatRows(monthly.rows),
        yearly: formatRows(yearly.rows),
      },
      productPerformance: productPerf.rows.map((r) => ({
        name: String(r.name),
        units: Number(r.units),
        revenue: Number(r.revenue),
      })),
      customerStatistics: customerStats.rows[0]
        ? {
            totalCustomers: Number(customerStats.rows[0].total_customers || 0),
            activeCustomers: Number(customerStats.rows[0].active_customers || 0),
            purchasingCustomers: Number(customerStats.rows[0].purchasing_customers || 0),
            avgOrderValue: Number(customerStats.rows[0].avg_order_value || 0),
          }
        : { totalCustomers: 0, activeCustomers: 0, purchasingCustomers: 0, avgOrderValue: 0 },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateStoreSettings(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = storeSettingsSchema.parse(req.body);
    const [existing] = await db.select().from(storeSettings).limit(1);

    if (!existing) {
      const [created] = await db
        .insert(storeSettings)
        .values({
          storeName: data.storeName,
          supportEmail: data.supportEmail,
          supportPhone: data.supportPhone,
          storeAddress: data.storeAddress,
          shippingFlatFee: data.shippingFlatFee.toFixed(2),
          freeShippingThreshold: data.freeShippingThreshold.toFixed(2),
          codEnabled: data.codEnabled,
          onlinePaymentEnabled: data.onlinePaymentEnabled,
        })
        .returning();
      return res.json({ settings: created });
    }

    const [updated] = await db
      .update(storeSettings)
      .set({
        storeName: data.storeName,
        supportEmail: data.supportEmail,
        supportPhone: data.supportPhone,
        storeAddress: data.storeAddress,
        shippingFlatFee: data.shippingFlatFee.toFixed(2),
        freeShippingThreshold: data.freeShippingThreshold.toFixed(2),
        codEnabled: data.codEnabled,
        onlinePaymentEnabled: data.onlinePaymentEnabled,
        updatedAt: new Date(),
      })
      .where(eq(storeSettings.id, existing.id))
      .returning();

    res.json({ settings: updated });
  } catch (err) {
    next(err);
  }
}
