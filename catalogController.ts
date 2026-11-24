import { and, asc, count, desc, eq, gte, ilike, inArray, lte, or } from 'drizzle-orm';
import type { NextFunction, Response } from 'express';
import { db } from '../../db/index.ts';
import {
  categories,
  inventoryLogs,
  productImages,
  products,
  productVariants,
  reviews,
  storeSettings,
  users,
} from '../../db/schema.ts';
import type { AuthRequest } from '../middleware/auth.ts';
import { AppError } from '../middleware/errorHandler.ts';
import { ensureSeeded } from '../services/seedService.ts';
import { categorySchema, productSchema } from '../validators/schemas.ts';

export async function getPublicSettings(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await ensureSeeded();
    const [settings] = await db.select().from(storeSettings).limit(1);
    res.json({ settings });
  } catch (err) {
    next(err);
  }
}

export async function listCategories(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await ensureSeeded();
    const rows = await db.select().from(categories).orderBy(asc(categories.name));
    res.json({ categories: rows });
  } catch (err) {
    next(err);
  }
}

export async function createCategory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = categorySchema.parse(req.body);
    const [created] = await db
      .insert(categories)
      .values({
        name: data.name,
        slug: data.slug,
        description: data.description ?? null,
        imageUrl: data.imageUrl ?? null,
      })
      .returning();
    res.status(201).json({ category: created });
  } catch (err) {
    next(err);
  }
}

export async function updateCategory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) throw new AppError('Invalid category ID', 400);
    const data = categorySchema.parse(req.body);
    const [updated] = await db
      .update(categories)
      .set({
        name: data.name,
        slug: data.slug,
        description: data.description ?? null,
        imageUrl: data.imageUrl ?? null,
        updatedAt: new Date(),
      })
      .where(eq(categories.id, id))
      .returning();
    if (!updated) throw new AppError('Category not found', 404);
    res.json({ category: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteCategory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) throw new AppError('Invalid category ID', 400);
    const [{ value: prodCount }] = await db
      .select({ value: count() })
      .from(products)
      .where(eq(products.categoryId, id));

    if (Number(prodCount) > 0) {
      throw new AppError('Cannot delete a category that still has products assigned', 400);
    }

    const [deleted] = await db.delete(categories).where(eq(categories.id, id)).returning();
    if (!deleted) throw new AppError('Category not found', 404);
    res.json({ message: 'Category deleted' });
  } catch (err) {
    next(err);
  }
}

export async function listProducts(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await ensureSeeded();

    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const categorySlug = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    const minPrice = req.query.minPrice ? Number(req.query.minPrice) : null;
    const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : null;
    const sort = typeof req.query.sort === 'string' ? req.query.sort : 'featured';
    const featured = req.query.featured === 'true';
    const newArrival = req.query.newArrival === 'true';
    const bestSeller = req.query.bestSeller === 'true';
    const inStockOnly = req.query.inStock === 'true';
    const includeAllStatuses = req.user?.role === 'admin' && req.query.includeAll === 'true';

    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(48, Math.max(1, Number(req.query.limit || 12)));
    const offset = (page - 1) * limit;

    const conditions = [];

    if (!includeAllStatuses) {
      conditions.push(eq(products.status, 'active'));
    }

    if (search) {
      conditions.push(
        or(
          ilike(products.name, `%${search}%`),
          ilike(products.description, `%${search}%`),
          ilike(products.sku, `%${search}%`)
        )
      );
    }

    if (categorySlug && categorySlug !== 'all') {
      const [cat] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.slug, categorySlug))
        .limit(1);
      if (cat) {
        conditions.push(eq(products.categoryId, cat.id));
      } else {
        return res.json({
          products: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
        });
      }
    }

    if (minPrice !== null && !Number.isNaN(minPrice)) {
      conditions.push(gte(products.price, minPrice.toFixed(2)));
    }
    if (maxPrice !== null && !Number.isNaN(maxPrice)) {
      conditions.push(lte(products.price, maxPrice.toFixed(2)));
    }
    if (featured) conditions.push(eq(products.isFeatured, true));
    if (newArrival) conditions.push(eq(products.isNewArrival, true));
    if (bestSeller) conditions.push(eq(products.isBestSeller, true));
    if (inStockOnly) conditions.push(gte(products.stock, 1));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ value: totalCount }] = await db
      .select({ value: count() })
      .from(products)
      .where(whereClause);

    let orderByClause;
    switch (sort) {
      case 'price_asc':
        orderByClause = [asc(products.price)];
        break;
      case 'price_desc':
        orderByClause = [desc(products.price)];
        break;
      case 'newest':
        orderByClause = [desc(products.createdAt)];
        break;
      case 'rating':
        orderByClause = [desc(products.ratingAvg)];
        break;
      default:
        orderByClause = [desc(products.isFeatured), desc(products.isBestSeller), desc(products.createdAt)];
    }

    const rows = await db
      .select()
      .from(products)
      .where(whereClause)
      .orderBy(...orderByClause)
      .limit(limit)
      .offset(offset);

    if (rows.length === 0) {
      return res.json({
        products: [],
        pagination: { page, limit, total: Number(totalCount), totalPages: Math.ceil(Number(totalCount) / limit) },
      });
    }

    const productIds = rows.map((r) => r.id);
    const categoryIds = [...new Set(rows.map((r) => r.categoryId))];

    const [allImages, allVariants, allCats] = await Promise.all([
      db
        .select()
        .from(productImages)
        .where(inArray(productImages.productId, productIds))
        .orderBy(asc(productImages.sortOrder)),
      db.select().from(productVariants).where(inArray(productVariants.productId, productIds)),
      db.select().from(categories).where(inArray(categories.id, categoryIds)),
    ]);

    const catById = new Map(allCats.map((c) => [c.id, c]));

    const enriched = rows.map((p) => ({
      ...p,
      price: Number(p.price),
      compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
      ratingAvg: Number(p.ratingAvg),
      category: catById.get(p.categoryId) || null,
      images: allImages.filter((img) => img.productId === p.id),
      variants: allVariants
        .filter((v) => v.productId === p.id)
        .map((v) => ({ ...v, priceDelta: Number(v.priceDelta) })),
    }));

    res.json({
      products: enriched,
      pagination: {
        page,
        limit,
        total: Number(totalCount),
        totalPages: Math.ceil(Number(totalCount) / limit),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getProductDetail(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await ensureSeeded();
    const param = req.params.id;
    const numericId = Number(param);

    const [product] = await db
      .select()
      .from(products)
      .where(Number.isInteger(numericId) && numericId > 0 ? eq(products.id, numericId) : eq(products.slug, param))
      .limit(1);

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    const [catRows, images, variants, productReviews, relatedRows] = await Promise.all([
      db.select().from(categories).where(eq(categories.id, product.categoryId)).limit(1),
      db
        .select()
        .from(productImages)
        .where(eq(productImages.productId, product.id))
        .orderBy(asc(productImages.sortOrder)),
      db.select().from(productVariants).where(eq(productVariants.productId, product.id)),
      db
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
        .where(eq(reviews.productId, product.id))
        .orderBy(desc(reviews.createdAt)),
      db
        .select()
        .from(products)
        .where(and(eq(products.categoryId, product.categoryId), eq(products.status, 'active')))
        .limit(5),
    ]);

    const filteredRelated = relatedRows.filter((r) => r.id !== product.id).slice(0, 4);
    const relatedIds = filteredRelated.map((r) => r.id);
    const relatedImages =
      relatedIds.length > 0
        ? await db.select().from(productImages).where(inArray(productImages.productId, relatedIds))
        : [];

    res.json({
      product: {
        ...product,
        price: Number(product.price),
        compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
        ratingAvg: Number(product.ratingAvg),
        category: catRows[0] || null,
        images,
        variants: variants.map((v) => ({ ...v, priceDelta: Number(v.priceDelta) })),
        reviews: productReviews,
      },
      relatedProducts: filteredRelated.map((r) => ({
        ...r,
        price: Number(r.price),
        compareAtPrice: r.compareAtPrice ? Number(r.compareAtPrice) : null,
        ratingAvg: Number(r.ratingAvg),
        images: relatedImages.filter((img) => img.productId === r.id),
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function createProduct(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = productSchema.parse(req.body);

    const created = await db.transaction(async (tx) => {
      const [prod] = await tx
        .insert(products)
        .values({
          categoryId: data.categoryId,
          name: data.name,
          slug: data.slug,
          description: data.description,
          specifications: data.specifications,
          price: data.price.toFixed(2),
          compareAtPrice: data.compareAtPrice !== null ? data.compareAtPrice.toFixed(2) : null,
          stock: data.stock,
          sku: data.sku,
          status: data.status,
          isFeatured: data.isFeatured,
          isNewArrival: data.isNewArrival,
          isBestSeller: data.isBestSeller,
        })
        .returning();

      if (data.images && data.images.length > 0) {
        await tx.insert(productImages).values(
          data.images.map((img, idx) => ({
            productId: prod.id,
            url: img.url,
            altText: img.altText ?? prod.name,
            isPrimary: idx === 0 ? true : img.isPrimary,
            sortOrder: idx,
          }))
        );
      }

      if (data.variants && data.variants.length > 0) {
        await tx.insert(productVariants).values(
          data.variants.map((v) => ({
            productId: prod.id,
            name: v.name,
            sku: v.sku,
            priceDelta: v.priceDelta.toFixed(2),
            stock: v.stock,
            attributes: v.attributes,
          }))
        );
      }

      await tx.insert(inventoryLogs).values({
        productId: prod.id,
        changeAmount: data.stock,
        previousStock: 0,
        newStock: data.stock,
        reason: 'Product created by administrator',
        actorUserId: req.user?.id ?? null,
      });

      return prod;
    });

    res.status(201).json({ product: created });
  } catch (err) {
    next(err);
  }
}

export async function updateProduct(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) throw new AppError('Invalid product ID', 400);
    const data = productSchema.parse(req.body);

    const updated = await db.transaction(async (tx) => {
      const [existing] = await tx.select().from(products).where(eq(products.id, id)).limit(1);
      if (!existing) throw new AppError('Product not found', 404);

      const [prod] = await tx
        .update(products)
        .set({
          categoryId: data.categoryId,
          name: data.name,
          slug: data.slug,
          description: data.description,
          specifications: data.specifications,
          price: data.price.toFixed(2),
          compareAtPrice: data.compareAtPrice !== null ? data.compareAtPrice.toFixed(2) : null,
          stock: data.stock,
          sku: data.sku,
          status: data.status,
          isFeatured: data.isFeatured,
          isNewArrival: data.isNewArrival,
          isBestSeller: data.isBestSeller,
          updatedAt: new Date(),
        })
        .where(eq(products.id, id))
        .returning();

      if (existing.stock !== data.stock) {
        await tx.insert(inventoryLogs).values({
          productId: id,
          changeAmount: data.stock - existing.stock,
          previousStock: existing.stock,
          newStock: data.stock,
          reason: 'Manual stock edit via product update',
          actorUserId: req.user?.id ?? null,
        });
      }

      if (data.images) {
        await tx.delete(productImages).where(eq(productImages.productId, id));
        if (data.images.length > 0) {
          await tx.insert(productImages).values(
            data.images.map((img, idx) => ({
              productId: id,
              url: img.url,
              altText: img.altText ?? prod.name,
              isPrimary: idx === 0 ? true : img.isPrimary,
              sortOrder: idx,
            }))
          );
        }
      }

      if (data.variants) {
        await tx.delete(productVariants).where(eq(productVariants.productId, id));
        if (data.variants.length > 0) {
          await tx.insert(productVariants).values(
            data.variants.map((v) => ({
              productId: id,
              name: v.name,
              sku: v.sku,
              priceDelta: v.priceDelta.toFixed(2),
              stock: v.stock,
              attributes: v.attributes,
            }))
          );
        }
      }

      return prod;
    });

    res.json({ product: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteProduct(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) throw new AppError('Invalid product ID', 400);

    // Archive instead of hard deleting if referenced by historical orders
    const [archived] = await db
      .update(products)
      .set({ status: 'archived', updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();

    if (!archived) throw new AppError('Product not found', 404);
    res.json({ message: 'Product archived', product: archived });
  } catch (err) {
    next(err);
  }
}
