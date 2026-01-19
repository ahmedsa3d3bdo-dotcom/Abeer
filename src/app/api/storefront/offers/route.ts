import { NextResponse } from "next/server";
import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    const now = new Date();
    const rows = await db
      .select({
        id: schema.discounts.id,
        name: schema.discounts.name,
        type: schema.discounts.type,
        value: schema.discounts.value,
        scope: schema.discounts.scope,
        startsAt: schema.discounts.startsAt,
        endsAt: schema.discounts.endsAt,
        metadata: schema.discounts.metadata,
      })
      .from(schema.discounts)
      .where(
        sql`${schema.discounts.isAutomatic} = true and ${schema.discounts.status} = 'active' and (${schema.discounts.startsAt} is null or ${schema.discounts.startsAt} <= ${now}) and (${schema.discounts.endsAt} is null or ${schema.discounts.endsAt} >= ${now})`
      )
      .orderBy(schema.discounts.startsAt as any);

    const ids = rows.map((r) => r.id);
    let productMap: Record<string, string[]> = {};
    let categoryMap: Record<string, string[]> = {};
    if (ids.length) {
      const prodRows = await db
        .select({ did: schema.discountProducts.discountId, pid: schema.discountProducts.productId })
        .from(schema.discountProducts)
        .where(sql`${schema.discountProducts.discountId} in ${ids}`);
      for (const r of prodRows) {
        (productMap[r.did] ||= []).push(r.pid);
      }
      const catRows = await db
        .select({ did: schema.discountCategories.discountId, cid: schema.discountCategories.categoryId })
        .from(schema.discountCategories)
        .where(sql`${schema.discountCategories.discountId} in ${ids}`);
      for (const r of catRows) {
        (categoryMap[r.did] ||= []).push(r.cid);
      }
    }

    const items = rows.map((r) => ({
      ...r,
      productIds: productMap[r.id] || [],
      categoryIds: categoryMap[r.id] || [],
    }));

    return NextResponse.json({ success: true, data: { items } });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: { message: e?.message || "Failed to load offers" } }, { status: 500 });
  }
}
