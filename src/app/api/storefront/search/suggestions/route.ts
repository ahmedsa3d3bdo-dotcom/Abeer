import { NextRequest, NextResponse } from "next/server";
import { storefrontProductsService } from "@/server/storefront/services/products.service";
import { storefrontCategoriesRepository } from "@/server/storefront/repositories/categories.repository";
import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { and, eq, ilike, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const qRaw = (searchParams.get("q") || "").trim();
    const limit = Math.min(8, Math.max(1, parseInt(searchParams.get("limit") || "5")));
    const categoryIdParam = (searchParams.get("categoryId") || "").trim() || undefined;
    const categorySlug = (searchParams.get("categorySlug") || "").trim() || undefined;

    const q = qRaw.slice(0, 80);

    let categoryId: string | undefined;
    if (categoryIdParam) {
      categoryId = categoryIdParam;
    } else if (categorySlug) {
      const cat = await storefrontCategoriesRepository.getBySlug(categorySlug);
      categoryId = (cat as any)?.id;
    }

    let products: any[] = [];
    if (q) {
      const res = await storefrontProductsService.list({ page: 1, limit, search: q, categoryIds: categoryId ? [categoryId] : undefined });
      products = res.items;
    }

    let categories: Array<{ id: string; name: string; slug: string }>;    
    if (q) {
      const rows = await db
        .select({ id: schema.categories.id, name: schema.categories.name, slug: schema.categories.slug })
        .from(schema.categories)
        .where(and(ilike(schema.categories.name, `%${q}%`), eq(schema.categories.isActive, true)))
        .limit(limit);
      categories = rows as any;
    } else {
      const top = await storefrontCategoriesRepository.getTopLevel(6);
      categories = top.map((c: any) => ({ id: c.id, name: c.name, slug: c.slug }));
    }

    let popularQueries: string[] = [];
    if (!q) {
      const trending = await storefrontProductsService.getTrending(6);
      popularQueries = trending.map((p: any) => p.name);
    }

    return NextResponse.json({ success: true, data: { products, categories, popularQueries } });
  } catch (e) {
    return NextResponse.json({ success: false, error: { message: e instanceof Error ? e.message : "Failed to fetch suggestions" } }, { status: 500 });
  }
}
