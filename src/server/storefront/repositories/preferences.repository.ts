import { db } from "@/shared/db";
import { userNotificationPreferences } from "@/shared/db/schema";
import { and, eq, inArray } from "drizzle-orm";

export class PreferencesRepository {
  async getOrCreate(userId: string) {
    const [row] = await db.select().from(userNotificationPreferences).where(eq(userNotificationPreferences.userId, userId)).limit(1);
    if (row) return row;
    const [created] = await db
      .insert(userNotificationPreferences)
      .values({ userId })
      .onConflictDoNothing({ target: [userNotificationPreferences.userId] })
      .returning();
    if (created) return created;
    const [again] = await db.select().from(userNotificationPreferences).where(eq(userNotificationPreferences.userId, userId)).limit(1);
    return again!;
  }

  async update(userId: string, patch: Partial<{
    promotions: boolean;
    backInStock: boolean;
    priceDrop: boolean;
    emailOrderUpdates: boolean;
    emailPromotions: boolean;
    emailNewsletter: boolean;
    emailRecommendations: boolean;
  }>) {
    const [row] = await db
      .insert(userNotificationPreferences)
      .values({ userId, ...patch } as any)
      .onConflictDoUpdate({ target: [userNotificationPreferences.userId], set: { ...patch, updatedAt: new Date() } as any })
      .returning();
    return row;
  }

  async listEnabledUserIds(flag: "promotions" | "backInStock" | "priceDrop", userIds: string[]) {
    if (!userIds.length) return [] as string[];
    const col = flag === "promotions" ? userNotificationPreferences.promotions : flag === "backInStock" ? userNotificationPreferences.backInStock : userNotificationPreferences.priceDrop;
    // rows with any preferences (present)
    const presentRows = await db
      .select({ userId: userNotificationPreferences.userId, promotions: userNotificationPreferences.promotions, backInStock: userNotificationPreferences.backInStock, priceDrop: userNotificationPreferences.priceDrop })
      .from(userNotificationPreferences)
      .where(inArray(userNotificationPreferences.userId, userIds));
    const presentIds = new Set(presentRows.map((r) => String(r.userId)));
    // allowed = those present and opted-in for the specific flag
    const allowedPresent = new Set(
      presentRows
        .filter((r) => (flag === "promotions" ? r.promotions : flag === "backInStock" ? r.backInStock : r.priceDrop))
        .map((r) => String(r.userId)),
    );
    // defaults = users with no row (presentIds doesn't contain them) -> default opt-in
    const defaults = userIds.filter((id) => !presentIds.has(id));
    return [...Array.from(allowedPresent), ...defaults] as string[];
  }
}

export const preferencesRepository = new PreferencesRepository();
