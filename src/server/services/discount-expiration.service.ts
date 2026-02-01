/**
 * Discount Expiration Service
 * Automatically updates discount status to 'expired' when end date passes
 */

import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { and, eq, lte, sql } from "drizzle-orm";

class DiscountExpirationService {
  private readonly intervalMs = 60 * 60 * 1000; // Run every hour

  /**
   * Start the internal scheduler for automatic discount expiration
   */
  ensureInternalSchedulerStarted() {
    const enabled =
      process.env.DISCOUNT_EXPIRATION_SCHEDULER !== "false" &&
      process.env.DISCOUNT_EXPIRATION_SCHEDULER !== "0";

    if (!enabled) {
      console.log("[Discount Expiration] Scheduler disabled via environment variable");
      return;
    }

    const g = globalThis as any;
    if (g.__discountExpirationSchedulerStarted) return;
    g.__discountExpirationSchedulerStarted = true;

    console.log("[Discount Expiration] Starting scheduler (runs every hour)");

    // Run immediately on startup
    this.expireDiscounts().catch((err) => {
      console.error("[Discount Expiration] Initial run failed:", err);
    });

    // Then run every hour
    g.__discountExpirationSchedulerInterval = setInterval(() => {
      this.expireDiscounts().catch((err) => {
        console.error("[Discount Expiration] Scheduled run failed:", err);
      });
    }, this.intervalMs);
  }

  /**
   * Find and expire discounts that have passed their end date
   */
  async expireDiscounts() {
    try {
      const now = new Date();

      // Find all active discounts where endsAt has passed
      const result = await db
        .update(schema.discounts)
        .set({ status: "expired" })
        .where(
          and(
            eq(schema.discounts.status, "active"),
            lte(schema.discounts.endsAt, now),
            sql`${schema.discounts.endsAt} IS NOT NULL`
          )
        )
        .returning({ id: schema.discounts.id, name: schema.discounts.name });

      if (result.length > 0) {
        console.log(
          `[Discount Expiration] Expired ${result.length} discount(s):`,
          result.map((d) => d.name).join(", ")
        );
      }

      return {
        success: true,
        expiredCount: result.length,
        expiredDiscounts: result,
      };
    } catch (error) {
      console.error("[Discount Expiration] Error expiring discounts:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        expiredCount: 0,
      };
    }
  }

  /**
   * Manually trigger discount expiration (for API endpoint)
   */
  async manualExpire() {
    return this.expireDiscounts();
  }
}

export const discountExpirationService = new DiscountExpirationService();
