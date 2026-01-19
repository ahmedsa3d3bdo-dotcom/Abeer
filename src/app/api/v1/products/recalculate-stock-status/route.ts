import type { NextRequest } from "next/server";
import { sql } from "drizzle-orm";

import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { settingsRepository } from "@/server/repositories/settings.repository";
import { requirePermission } from "@/server/utils/rbac";
import { handleRouteError, successResponse } from "@/server/utils/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

async function getLowStockThreshold() {
  const s = await settingsRepository.findByKey("low_stock_threshold");
  const n = Number(s?.value);
  if (!Number.isFinite(n)) return 5;
  return Math.max(1, Math.floor(n));
}

export async function POST(request: NextRequest) {
  try {
    await requirePermission(request, "products.update");

    const threshold = await getLowStockThreshold();

    const res = await db.transaction(async (tx) => {
      const withVariants = await (tx as any).execute(sql`
        update ${schema.products} p
        set
          stock_status = case
            when coalesce(v.total, 0) <= 0 then 'out_of_stock'
            when coalesce(v.total, 0) <= ${threshold} then 'low_stock'
            else 'in_stock'
          end,
          updated_at = now()
        from (
          select
            pv.product_id as product_id,
            coalesce(sum((pv.stock_quantity - pv.reserved_quantity)), 0) as total
          from ${schema.productVariants} pv
          where pv.is_active = true
          group by pv.product_id
        ) v
        where p.id = v.product_id
      `);

      const withoutVariants = await (tx as any).execute(sql`
        update ${schema.products} p
        set
          stock_status = case
            when coalesce(i.avail, 0) <= 0 then 'out_of_stock'
            when coalesce(i.avail, 0) <= ${threshold} then 'low_stock'
            else 'in_stock'
          end,
          updated_at = now()
        from (
          select
            inv.product_id as product_id,
            coalesce(sum(inv.available_quantity), 0) as avail
          from ${schema.inventory} inv
          where inv.variant_id is null
          group by inv.product_id
        ) i
        where p.id = i.product_id
          and not exists (
            select 1
            from ${schema.productVariants} pv
            where pv.product_id = p.id
              and pv.is_active = true
          )
      `);

      const noInventory = await (tx as any).execute(sql`
        update ${schema.products} p
        set
          stock_status = 'out_of_stock',
          updated_at = now()
        where not exists (
          select 1
          from ${schema.productVariants} pv
          where pv.product_id = p.id
            and pv.is_active = true
        )
        and not exists (
          select 1
          from ${schema.inventory} inv
          where inv.product_id = p.id
            and inv.variant_id is null
        )
      `);

      const updated =
        Number((withVariants as any)?.rowCount || 0) +
        Number((withoutVariants as any)?.rowCount || 0) +
        Number((noInventory as any)?.rowCount || 0);

      return { updated };
    });

    return successResponse({ threshold, updated: res.updated });
  } catch (e) {
    return handleRouteError(e, request);
  }
}
