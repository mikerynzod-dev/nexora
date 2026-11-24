import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import type { NextFunction, Response } from 'express';
import { db } from '../../db/index.ts';
import { orderItems, orders, payments } from '../../db/schema.ts';
import { env } from '../config/env.ts';
import type { AuthRequest } from '../middleware/auth.ts';
import { AppError } from '../middleware/errorHandler.ts';

function verifyPaymongoSignature(rawBody: Buffer, signatureHeader: string, secret: string): boolean {
  // PayMongo signature header format: t=<timestamp>,te=<test_sig>,li=<live_sig>
  const parts = signatureHeader.split(',').reduce<Record<string, string>>((acc, part) => {
    const [k, v] = part.split('=');
    if (k && v) acc[k.trim()] = v.trim();
    return acc;
  }, {});

  const timestamp = parts.t;
  const candidateSig = parts.te || parts.li;
  if (!timestamp || !candidateSig) return false;

  const signedPayload = `${timestamp}.${rawBody.toString('utf8')}`;
  const expected = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');

  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(candidateSig, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function createCheckoutSession(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError('Authentication required', 401);
    const orderId = Number(req.body?.orderId);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      throw new AppError('Valid orderId is required', 400);
    }

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) throw new AppError('Order not found', 404);
    if (order.userId !== req.user.id && req.user.role !== 'admin') {
      throw new AppError('Access denied', 403);
    }
    if (order.paymentStatus === 'Paid') {
      throw new AppError('Order is already paid', 400);
    }

    if (!env.paymongoSecretKey) {
      throw new AppError(
        'Online payment gateway (PAYMONGO_SECRET_KEY) is not configured in environment secrets. Please configure it in Settings -> Secrets or choose Cash on Delivery.',
        503,
        'PAYMENT_GATEWAY_UNCONFIGURED'
      );
    }

    const [existingPayment] = await db
      .select()
      .from(payments)
      .where(eq(payments.orderId, order.id))
      .limit(1);

    if (existingPayment?.checkoutUrl && existingPayment.status === 'Pending') {
      return res.json({ checkoutUrl: existingPayment.checkoutUrl, reference: existingPayment.providerReference });
    }

    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));

    const lineItems = items.map((item) => ({
      currency: 'PHP',
      amount: Math.round(Number(item.unitPriceSnapshot) * 100),
      name: item.variantNameSnapshot
        ? `${item.productNameSnapshot} (${item.variantNameSnapshot})`
        : item.productNameSnapshot,
      quantity: item.quantity,
    }));

    if (Number(order.shippingFee) > 0) {
      lineItems.push({
        currency: 'PHP',
        amount: Math.round(Number(order.shippingFee) * 100),
        name: 'Shipping Fee',
        quantity: 1,
      });
    }

    const authToken = Buffer.from(`${env.paymongoSecretKey}:`).toString('base64');
    const pmResponse = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        data: {
          attributes: {
            send_email_receipt: true,
            show_description: true,
            show_line_items: true,
            description: `NEXORA Order ${order.orderNumber}`,
            line_items: lineItems,
            payment_method_types: ['card', 'gcash', 'paymaya'],
            reference_number: order.orderNumber,
            success_url: `${env.appUrl}/account/orders/${order.orderNumber}?checkout=returned`,
            cancel_url: `${env.appUrl}/account/orders/${order.orderNumber}?checkout=cancelled`,
            metadata: {
              orderId: String(order.id),
              orderNumber: order.orderNumber,
            },
          },
        },
      }),
    });

    if (!pmResponse.ok) {
      const errBody = await pmResponse.text();
      console.error('PayMongo checkout creation failed:', errBody);
      throw new AppError('Unable to initialize payment gateway checkout session', 502);
    }

    const payload = (await pmResponse.json()) as {
      data?: { id?: string; attributes?: { checkout_url?: string } };
    };

    const checkoutUrl = payload.data?.attributes?.checkout_url;
    const providerReference = payload.data?.id;
    if (!checkoutUrl || !providerReference) {
      throw new AppError('Invalid response from payment gateway', 502);
    }

    await db
      .update(payments)
      .set({
        providerReference,
        checkoutUrl,
        updatedAt: new Date(),
      })
      .where(eq(payments.orderId, order.id));

    res.json({ checkoutUrl, reference: providerReference });
  } catch (err) {
    next(err);
  }
}

export async function handlePaymongoWebhook(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!env.paymongoWebhookSecret) {
      throw new AppError('Webhook secret is not configured', 503);
    }

    const signatureHeader = req.headers['paymongo-signature'];
    if (typeof signatureHeader !== 'string' || !req.rawBody) {
      throw new AppError('Missing webhook signature', 400);
    }

    const isValid = verifyPaymongoSignature(req.rawBody, signatureHeader, env.paymongoWebhookSecret);
    if (!isValid) {
      throw new AppError('Invalid webhook signature', 401);
    }

    const event = req.body as {
      data?: {
        attributes?: {
          type?: string;
          data?: {
            id?: string;
            attributes?: {
              reference_number?: string;
              metadata?: { orderId?: string };
            };
          };
        };
      };
    };

    const eventType = event.data?.attributes?.type;
    const checkoutData = event.data?.attributes?.data;
    const providerRef = checkoutData?.id;
    const orderIdMeta = Number(checkoutData?.attributes?.metadata?.orderId);

    if (eventType === 'checkout_session.payment.paid' && (providerRef || orderIdMeta)) {
      await db.transaction(async (tx) => {
        const [payment] = providerRef
          ? await tx
              .select()
              .from(payments)
              .where(eq(payments.providerReference, providerRef))
              .limit(1)
          : await tx
              .select()
              .from(payments)
              .where(eq(payments.orderId, orderIdMeta))
              .limit(1);

        if (!payment || payment.status === 'Paid') {
          return; // Idempotent guard
        }

        await tx
          .update(payments)
          .set({
            status: 'Paid',
            rawPayload: req.body as Record<string, unknown>,
            updatedAt: new Date(),
          })
          .where(eq(payments.id, payment.id));

        await tx
          .update(orders)
          .set({
            paymentStatus: 'Paid',
            status: 'Confirmed',
            updatedAt: new Date(),
          })
          .where(eq(orders.id, payment.orderId));
      });
    } else if (eventType === 'payment.failed' && (providerRef || orderIdMeta)) {
      await db.transaction(async (tx) => {
        const [payment] = providerRef
          ? await tx
              .select()
              .from(payments)
              .where(eq(payments.providerReference, providerRef))
              .limit(1)
          : await tx
              .select()
              .from(payments)
              .where(eq(payments.orderId, orderIdMeta))
              .limit(1);

        if (!payment || payment.status === 'Paid') return;

        await tx
          .update(payments)
          .set({
            status: 'Failed',
            rawPayload: req.body as Record<string, unknown>,
            updatedAt: new Date(),
          })
          .where(eq(payments.id, payment.id));

        await tx
          .update(orders)
          .set({ paymentStatus: 'Failed', updatedAt: new Date() })
          .where(eq(orders.id, payment.orderId));
      });
    }

    res.json({ received: true });
  } catch (err) {
    next(err);
  }
}
