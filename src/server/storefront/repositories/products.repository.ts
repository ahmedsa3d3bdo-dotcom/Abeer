import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { and, desc, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";

/**
 * Storefront Products Repository
 * Handles data access for customer-facing product queries
 */

interface ProductListParams {
  page?: number;
  limit?: number;
  categoryIds?: string[];
  productIds?: string[];
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  search?: string;
  inStock?: boolean;
  onSale?: boolean;
  sortBy?: "price_asc" | "price_desc" | "name" | "newest" | "rating" | "popular";
}

export class StorefrontProductsRepository {
  /**
   * List products for storefront with filters and sorting
   * Only returns active products
   */
  async list(params: ProductListParams) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(50, Math.max(1, params.limit || 12));
    const offset = (page - 1) * limit;

    const filters: any[] = [
      eq(schema.products.status, "active"), // Only active products
    ];

    // Search filter
    if (params.search) {
      const like = `%${params.search}%`;
      filters.push(
        or(
          ilike(schema.products.name, like),
          ilike(schema.products.description, like),
          ilike(schema.products.sku, like)
        ) as any
      );
    }

    if (params.productIds && params.productIds.length > 0) {
      filters.push(inArray(schema.products.id, params.productIds as any));
    }

    // Price range filter
    if (params.minPrice !== undefined) {
      filters.push(gte(schema.products.price, params.minPrice.toString()));
    }
    if (params.maxPrice !== undefined) {
      filters.push(lte(schema.products.price, params.maxPrice.toString()));
    }

    // Rating filter (use effective rating: stored average or computed from approved reviews)
    const avgApproved = sql<number>`(
      select avg(${schema.productReviews.rating})::numeric
      from ${schema.productReviews}
      where ${schema.productReviews.productId} = ${schema.products.id}
        and ${schema.productReviews.isApproved} = true
    )`;
    const effectiveRating = sql<number>`coalesce(nullif(${schema.products.averageRating}, 0), ${avgApproved})`;
    if (params.minRating !== undefined) {
      const existsHigh = sql`exists (
        select 1 from ${schema.productReviews}
        where ${schema.productReviews.productId} = ${schema.products.id}
          and ${schema.productReviews.isApproved} = true
          and ${schema.productReviews.rating} >= ${params.minRating}
      )`;
      filters.push(sql`( (${effectiveRating}) >= ${params.minRating} or ${existsHigh} )` as any);
    }

    // In stock filter
    if (params.inStock) {
      filters.push(eq(schema.products.stockStatus, "in_stock"));
    }

    // On sale filter: compare_at_price exists and is greater than price
    if (params.onSale) {
      filters.push(sql`${schema.products.compareAtPrice} is not null and ${schema.products.compareAtPrice} > ${schema.products.price}` as any);
    }

    const where = filters.length ? and(...filters) : undefined;

    // Determine sort order
    let orderBy: any;
    switch (params.sortBy) {
      case "price_asc":
        orderBy = schema.products.price;
        break;
      case "price_desc":
        orderBy = desc(schema.products.price);
        break;
      case "name":
        orderBy = schema.products.name;
        break;
      case "rating":
        orderBy = desc(effectiveRating as any);
        break;
      case "popular":
        orderBy = desc(schema.products.soldCount);
        break;
      case "newest":
      default:
        orderBy = desc(schema.products.createdAt);
        break;
    }

    // Subqueries for images (product image, then variant image fallback)
    const primaryImageOnly = sql<string>`(
      select pi.url
      from ${schema.productImages} pi
      where pi.product_id = ${schema.products.id}
      order by pi.is_primary desc, pi.sort_order asc
      limit 1
    )`;
    const variantImageOnly = sql<string>`(
      select pv.image
      from ${schema.productVariants} pv
      where pv.product_id = ${schema.products.id} and pv.is_active = true and pv.image is not null
      order by pv.sort_order asc
      limit 1
    )`;
    const primaryImageUrl = sql<string>`coalesce(${primaryImageOnly}, ${variantImageOnly})`;
    const countApproved = sql<number>`(
      select count(*)::int
      from ${schema.productReviews}
      where ${schema.productReviews.productId} = ${schema.products.id}
        and ${schema.productReviews.isApproved} = true
    )`;
    const effectiveReviewCount = sql<number>`coalesce(nullif(${schema.products.reviewCount}, 0), ${countApproved})`;

    let query = db
      .select({
        id: schema.products.id,
        name: schema.products.name,
        slug: schema.products.slug,
        price: schema.products.price,
        compareAtPrice: schema.products.compareAtPrice,
        primaryImageUrl,
        rating: effectiveRating,
        reviewCount: effectiveReviewCount,
        stockStatus: schema.products.stockStatus,
        isFeatured: schema.products.isFeatured,
      })
      .from(schema.products);

    // Add category filter if specified (supports multi-select)
    if (params.categoryIds && params.categoryIds.length > 0) {
      query = query
        .innerJoin(
          schema.productCategories,
          eq(schema.productCategories.productId, schema.products.id)
        )
        .where(
          and(
            where as any,
            inArray(schema.productCategories.categoryId, params.categoryIds)
          )
        ) as any;
    } else {
      query = query.where(where as any) as any;
    }

    // Execute query with ordering and pagination
    const items = await query
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    let countResult;
    if (params.categoryIds && params.categoryIds.length > 0) {
      [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.products)
        .innerJoin(
          schema.productCategories,
          eq(schema.productCategories.productId, schema.products.id)
        )
        .where(
          and(
            where as any,
            inArray(schema.productCategories.categoryId, params.categoryIds)
          )
        );
    } else {
      [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.products)
        .where(where as any);
    }

    const count = countResult.count;

    return {
      items,
      total: Number(count),
      page,
      limit,
      hasMore: offset + items.length < Number(count),
    };
  }

  async listCompareAtSaleProductIds() {
    const rows = await db
      .select({ id: schema.products.id })
      .from(schema.products)
      .where(
        and(
          eq(schema.products.status, "active"),
          sql`${schema.products.compareAtPrice} is not null and ${schema.products.compareAtPrice} > ${schema.products.price}` as any
        )
      );
    return rows.map((r) => String(r.id));
  }

  /**
   * Get product detail by slug
   * Includes all images, variants, and categories
   */
  async getBySlug(slug: string) {
    const avgApproved = sql<number>`(
      select avg(${schema.productReviews.rating})::numeric
      from ${schema.productReviews}
      where ${schema.productReviews.productId} = ${schema.products.id}
        and ${schema.productReviews.isApproved} = true
    )`;
    const effectiveRating = sql<number>`coalesce(nullif(${schema.products.averageRating}, 0), ${avgApproved})`;
    const countApproved = sql<number>`(
      select count(*)::int
      from ${schema.productReviews}
      where ${schema.productReviews.productId} = ${schema.products.id}
        and ${schema.productReviews.isApproved} = true
    )`;
    const effectiveReviewCount = sql<number>`coalesce(nullif(${schema.products.reviewCount}, 0), ${countApproved})`;

    const [product] = await db
      .select({
        id: schema.products.id,
        name: schema.products.name,
        slug: schema.products.slug,
        sku: schema.products.sku,
        serialNumber: schema.products.serialNumber,
        specMaterial: schema.products.specMaterial,
        specColor: schema.products.specColor,
        specDimensions: schema.products.specDimensions,
        specStyle: schema.products.specStyle,
        specIdealFor: schema.products.specIdealFor,
        description: schema.products.description,
        shortDescription: schema.products.shortDescription,
        price: schema.products.price,
        compareAtPrice: schema.products.compareAtPrice,
        status: schema.products.status,
        stockStatus: schema.products.stockStatus,
        allowReviews: schema.products.allowReviews,
        averageRating: effectiveRating,
        reviewCount: effectiveReviewCount,
        metaTitle: schema.products.metaTitle,
        metaDescription: schema.products.metaDescription,
      })
      .from(schema.products)
      .where(
        and(
          eq(schema.products.slug, slug),
          eq(schema.products.status, "active")
        )
      )
      .limit(1);

    if (!product) {
      return null;
    }

    // Get images
    const images = await db
      .select({
        id: schema.productImages.id,
        url: schema.productImages.url,
        altText: schema.productImages.altText,
        sortOrder: schema.productImages.sortOrder,
        isPrimary: schema.productImages.isPrimary,
      })
      .from(schema.productImages)
      .where(eq(schema.productImages.productId, product.id))
      .orderBy(
        desc(schema.productImages.isPrimary),
        schema.productImages.sortOrder
      );

    // Get variants
    const variants = await db
      .select({
        id: schema.productVariants.id,
        sku: schema.productVariants.sku,
        name: schema.productVariants.name,
        price: schema.productVariants.price,
        stockQuantity: sql<number>`greatest(0, ${schema.productVariants.stockQuantity} - ${schema.productVariants.reservedQuantity})`,
        options: schema.productVariants.options,
        image: schema.productVariants.image,
        isActive: schema.productVariants.isActive,
      })
      .from(schema.productVariants)
      .where(
        and(
          eq(schema.productVariants.productId, product.id),
          eq(schema.productVariants.isActive, true)
        )
      )
      .orderBy(schema.productVariants.sortOrder);

    // Get categories
    const categories = await db
      .select({
        id: schema.categories.id,
        name: schema.categories.name,
        slug: schema.categories.slug,
      })
      .from(schema.categories)
      .innerJoin(
        schema.productCategories,
        eq(schema.productCategories.categoryId, schema.categories.id)
      )
      .where(eq(schema.productCategories.productId, product.id));

    return {
      ...product,
      images,
      variants,
      categories,
    };
  }

  /**
   * Get product detail by ID
   * Includes all images, variants, and categories
   */
  async getById(id: string) {
    const avgApproved = sql<number>`(
      select avg(${schema.productReviews.rating})::numeric
      from ${schema.productReviews}
      where ${schema.productReviews.productId} = ${schema.products.id}
        and ${schema.productReviews.isApproved} = true
    )`;
    const effectiveRating = sql<number>`coalesce(nullif(${schema.products.averageRating}, 0), ${avgApproved})`;
    const countApproved = sql<number>`(
      select count(*)::int
      from ${schema.productReviews}
      where ${schema.productReviews.productId} = ${schema.products.id}
        and ${schema.productReviews.isApproved} = true
    )`;
    const effectiveReviewCount = sql<number>`coalesce(nullif(${schema.products.reviewCount}, 0), ${countApproved})`;

    const [product] = await db
      .select({
        id: schema.products.id,
        name: schema.products.name,
        slug: schema.products.slug,
        sku: schema.products.sku,
        serialNumber: schema.products.serialNumber,
        specMaterial: schema.products.specMaterial,
        specColor: schema.products.specColor,
        specDimensions: schema.products.specDimensions,
        specStyle: schema.products.specStyle,
        specIdealFor: schema.products.specIdealFor,
        description: schema.products.description,
        shortDescription: schema.products.shortDescription,
        price: schema.products.price,
        compareAtPrice: schema.products.compareAtPrice,
        status: schema.products.status,
        stockStatus: schema.products.stockStatus,
        allowReviews: schema.products.allowReviews,
        averageRating: effectiveRating,
        reviewCount: effectiveReviewCount,
        metaTitle: schema.products.metaTitle,
        metaDescription: schema.products.metaDescription,
      })
      .from(schema.products)
      .where(
        and(
          eq(schema.products.id, id),
          eq(schema.products.status, "active")
        )
      )
      .limit(1);

    if (!product) {
      return null;
    }

    const images = await db
      .select({
        id: schema.productImages.id,
        url: schema.productImages.url,
        altText: schema.productImages.altText,
        sortOrder: schema.productImages.sortOrder,
        isPrimary: schema.productImages.isPrimary,
      })
      .from(schema.productImages)
      .where(eq(schema.productImages.productId, product.id))
      .orderBy(desc(schema.productImages.isPrimary), schema.productImages.sortOrder);

    const variants = await db
      .select({
        id: schema.productVariants.id,
        sku: schema.productVariants.sku,
        name: schema.productVariants.name,
        price: schema.productVariants.price,
        stockQuantity: sql<number>`greatest(0, ${schema.productVariants.stockQuantity} - ${schema.productVariants.reservedQuantity})`,
        options: schema.productVariants.options,
        image: schema.productVariants.image,
        isActive: schema.productVariants.isActive,
      })
      .from(schema.productVariants)
      .where(
        and(
          eq(schema.productVariants.productId, product.id),
          eq(schema.productVariants.isActive, true)
        )
      )
      .orderBy(schema.productVariants.sortOrder);

    const categories = await db
      .select({
        id: schema.categories.id,
        name: schema.categories.name,
        slug: schema.categories.slug,
      })
      .from(schema.categories)
      .innerJoin(
        schema.productCategories,
        eq(schema.productCategories.categoryId, schema.categories.id)
      )
      .where(eq(schema.productCategories.productId, product.id));

    return {
      ...product,
      images,
      variants,
      categories,
    };
  }

  /**
   * Get featured products for homepage
   */
  async getFeatured(limit = 8) {
    const primaryImageOnly = sql<string>`(
      select pi.url
      from ${schema.productImages} pi
      where pi.product_id = ${schema.products.id}
      order by pi.is_primary desc, pi.sort_order asc
      limit 1
    )`;
    const variantImageOnly = sql<string>`(
      select pv.image
      from ${schema.productVariants} pv
      where pv.product_id = ${schema.products.id} and pv.is_active = true and pv.image is not null
      order by pv.sort_order asc
      limit 1
    )`;
    const primaryImageUrl = sql<string>`coalesce(${primaryImageOnly}, ${variantImageOnly})`;

    const avgApproved = sql<number>`(
      select avg(${schema.productReviews.rating})::numeric
      from ${schema.productReviews}
      where ${schema.productReviews.productId} = ${schema.products.id}
        and ${schema.productReviews.isApproved} = true
    )`;
    const effectiveRating = sql<number>`coalesce(nullif(${schema.products.averageRating}, 0), ${avgApproved})`;
    const countApproved = sql<number>`(
      select count(*)::int
      from ${schema.productReviews}
      where ${schema.productReviews.productId} = ${schema.products.id}
        and ${schema.productReviews.isApproved} = true
    )`;
    const effectiveReviewCount = sql<number>`coalesce(nullif(${schema.products.reviewCount}, 0), ${countApproved})`;

    const items = await db
      .select({
        id: schema.products.id,
        name: schema.products.name,
        slug: schema.products.slug,
        price: schema.products.price,
        compareAtPrice: schema.products.compareAtPrice,
        primaryImageUrl,
        rating: effectiveRating,
        reviewCount: effectiveReviewCount,
        stockStatus: schema.products.stockStatus,
        isFeatured: schema.products.isFeatured,
      })
      .from(schema.products)
      .where(
        and(
          eq(schema.products.status, "active"),
          eq(schema.products.isFeatured, true)
        )
      )
      .orderBy(desc(schema.products.createdAt))
      .limit(limit);

    return items;
  }

  /**
   * Get trending/popular products
   */
  async getTrending(limit = 8) {
    const primaryImageOnly = sql<string>`(
      select pi.url
      from ${schema.productImages} pi
      where pi.product_id = ${schema.products.id}
      order by pi.is_primary desc, pi.sort_order asc
      limit 1
    )`;
    const variantImageOnly = sql<string>`(
      select pv.image
      from ${schema.productVariants} pv
      where pv.product_id = ${schema.products.id} and pv.is_active = true and pv.image is not null
      order by pv.sort_order asc
      limit 1
    )`;
    const primaryImageUrl = sql<string>`coalesce(${primaryImageOnly}, ${variantImageOnly})`;

    const avgApproved = sql<number>`(
      select avg(${schema.productReviews.rating})::numeric
      from ${schema.productReviews}
      where ${schema.productReviews.productId} = ${schema.products.id}
        and ${schema.productReviews.isApproved} = true
    )`;
    const effectiveRating = sql<number>`coalesce(nullif(${schema.products.averageRating}, 0), ${avgApproved})`;
    const countApproved = sql<number>`(
      select count(*)::int
      from ${schema.productReviews}
      where ${schema.productReviews.productId} = ${schema.products.id}
        and ${schema.productReviews.isApproved} = true
    )`;
    const effectiveReviewCount = sql<number>`coalesce(nullif(${schema.products.reviewCount}, 0), ${countApproved})`;

    const items = await db
      .select({
        id: schema.products.id,
        name: schema.products.name,
        slug: schema.products.slug,
        price: schema.products.price,
        compareAtPrice: schema.products.compareAtPrice,
        primaryImageUrl,
        rating: effectiveRating,
        reviewCount: effectiveReviewCount,
        stockStatus: schema.products.stockStatus,
        isFeatured: schema.products.isFeatured,
      })
      .from(schema.products)
      .where(eq(schema.products.status, "active"))
      .orderBy(desc(schema.products.soldCount), desc(schema.products.viewCount))
      .limit(limit);

    return items;
  }

  /**
   * Get related products based on categories
   */
  async getRelated(productId: string, limit = 4) {
    // Get categories of the current product
    const productCategories = await db
      .select({ categoryId: schema.productCategories.categoryId })
      .from(schema.productCategories)
      .where(eq(schema.productCategories.productId, productId));

    if (productCategories.length === 0) {
      return [];
    }

    const categoryIds = productCategories.map((pc) => pc.categoryId);

    const primaryImageOnlyRelated = sql<string>`(
      select pi.url
      from ${schema.productImages} pi
      where pi.product_id = ${schema.products.id}
      order by pi.is_primary desc, pi.sort_order asc
      limit 1
    )`;
    const variantImageOnlyRelated = sql<string>`(
      select pv.image
      from ${schema.productVariants} pv
      where pv.product_id = ${schema.products.id} and pv.is_active = true and pv.image is not null
      order by pv.sort_order asc
      limit 1
    )`;
    const primaryImageUrl = sql<string>`coalesce(${primaryImageOnlyRelated}, ${variantImageOnlyRelated})`;

    const avgApproved = sql<number>`(
      select avg(${schema.productReviews.rating})::numeric
      from ${schema.productReviews}
      where ${schema.productReviews.productId} = ${schema.products.id}
        and ${schema.productReviews.isApproved} = true
    )`;
    const effectiveRating = sql<number>`coalesce(nullif(${schema.products.averageRating}, 0), ${avgApproved})`;
    const countApproved = sql<number>`(
      select count(*)::int
      from ${schema.productReviews}
      where ${schema.productReviews.productId} = ${schema.products.id}
        and ${schema.productReviews.isApproved} = true
    )`;
    const effectiveReviewCount = sql<number>`coalesce(nullif(${schema.products.reviewCount}, 0), ${countApproved})`;

    // Find products in same categories
    const items = await db
      .selectDistinct({
        id: schema.products.id,
        name: schema.products.name,
        slug: schema.products.slug,
        price: schema.products.price,
        compareAtPrice: schema.products.compareAtPrice,
        primaryImageUrl,
        rating: effectiveRating,
        reviewCount: effectiveReviewCount,
        stockStatus: schema.products.stockStatus,
        isFeatured: schema.products.isFeatured,
      })
      .from(schema.products)
      .innerJoin(
        schema.productCategories,
        eq(schema.productCategories.productId, schema.products.id)
      )
      .where(
        and(
          eq(schema.products.status, "active"),
          inArray(schema.productCategories.categoryId, categoryIds),
          sql`${schema.products.id} != ${productId}` // Exclude current product
        )
      )
      .orderBy(desc(schema.products.averageRating))
      .limit(limit);

    return items;
  }

  /**
   * Increment view count for a product
   */
  async incrementViewCount(productId: string) {
    await db
      .update(schema.products)
      .set({
        viewCount: sql`${schema.products.viewCount} + 1`,
      })
      .where(eq(schema.products.id, productId));
  }

  /**
   * Recommend products by a set of category IDs, excluding a list of product IDs.
   * Orders by soldCount desc, then viewCount desc.
   */
  async recommendByCategoryIds(categoryIds: string[], excludeProductIds: string[] = [], limit = 8) {
    if (!categoryIds || categoryIds.length === 0) return [] as any[];

    const primaryImageOnly = sql<string>`(
      select pi.url
      from ${schema.productImages} pi
      where pi.product_id = ${schema.products.id}
      order by pi.is_primary desc, pi.sort_order asc
      limit 1
    )`;
    const variantImageOnly = sql<string>`(
      select pv.image
      from ${schema.productVariants} pv
      where pv.product_id = ${schema.products.id} and pv.is_active = true and pv.image is not null
      order by pv.sort_order asc
      limit 1
    )`;
    const primaryImageUrl = sql<string>`coalesce(${primaryImageOnly}, ${variantImageOnly})`;

    const avgApproved = sql<number>`(
      select avg(${schema.productReviews.rating})::numeric
      from ${schema.productReviews}
      where ${schema.productReviews.productId} = ${schema.products.id}
        and ${schema.productReviews.isApproved} = true
    )`;
    const effectiveRating = sql<number>`coalesce(nullif(${schema.products.averageRating}, 0), ${avgApproved})`;
    const countApproved = sql<number>`(
      select count(*)::int
      from ${schema.productReviews}
      where ${schema.productReviews.productId} = ${schema.products.id}
        and ${schema.productReviews.isApproved} = true
    )`;
    const effectiveReviewCount = sql<number>`coalesce(nullif(${schema.products.reviewCount}, 0), ${countApproved})`;

    const rows = await db
      .selectDistinct({
        id: schema.products.id,
        name: schema.products.name,
        slug: schema.products.slug,
        price: schema.products.price,
        compareAtPrice: schema.products.compareAtPrice,
        primaryImageUrl,
        rating: effectiveRating,
        reviewCount: effectiveReviewCount,
        stockStatus: schema.products.stockStatus,
        isFeatured: schema.products.isFeatured,
        // Include order-by columns to satisfy DISTINCT requirements
        soldCount: schema.products.soldCount,
        viewCount: schema.products.viewCount,
      })
      .from(schema.products)
      .innerJoin(
        schema.productCategories,
        eq(schema.productCategories.productId, schema.products.id)
      )
      .where(
        and(
          eq(schema.products.status, "active"),
          inArray(schema.productCategories.categoryId, categoryIds)
        )
      )
      .orderBy(desc(schema.products.soldCount), desc(schema.products.viewCount))
      .limit(Math.max(limit * 3, 24));

    const items = rows.filter((r: any) => !excludeProductIds.includes(r.id)).slice(0, limit);
    return items;
  }
}

export const storefrontProductsRepository = new StorefrontProductsRepository();
