import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { sql, eq, and, gte, lte, desc, ne } from "drizzle-orm";

export class CustomersReportsRepository {
  async getAllCustomers(limit: number = 1000) {
    return await db
      .select({
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        email: schema.users.email,
        phone: schema.users.phone,
        createdAt: schema.users.createdAt,
        emailVerified: schema.users.emailVerified,
      })
      .from(schema.users)
      .orderBy(desc(schema.users.createdAt))
      .limit(limit);
  }

  async getTopCustomers(from: Date, to: Date, limit: number = 200) {
    return await db
      .select({
        name: sql<string>`concat(${schema.users.firstName}, ' ', ${schema.users.lastName})`,
        email: schema.users.email,
        orders: sql<number>`count(${schema.orders.id})`,
        totalSpent: sql<number>`coalesce(sum(${schema.orders.totalAmount}), 0)`,
        avgOrder: sql<number>`coalesce(avg(${schema.orders.totalAmount}), 0)`,
        lastPurchase: sql<string>`max(${schema.orders.createdAt})`,
      })
      .from(schema.users)
      .leftJoin(schema.orders, and(
        eq(schema.orders.userId, schema.users.id),
        ne(schema.orders.status, "cancelled")
      ))
      .groupBy(schema.users.id, schema.users.firstName, schema.users.lastName, schema.users.email)
      .having(sql`count(${schema.orders.id}) > 0`)
      .orderBy(desc(sql`coalesce(sum(${schema.orders.totalAmount}), 0)`))
      .limit(limit);
  }

  async getNewCustomers(from: Date, to: Date) {
    return await db
      .select({
        date: sql<string>`date_trunc('day', ${schema.users.createdAt})::date`,
        newCustomers: sql<number>`count(*)`,
      })
      .from(schema.users)
      .where(and(
        gte(schema.users.createdAt, from),
        lte(schema.users.createdAt, to)
      ))
      .groupBy(sql`date_trunc('day', ${schema.users.createdAt})::date`)
      .orderBy(sql`date_trunc('day', ${schema.users.createdAt})::date`);
  }

  async getCustomerSegments() {
    return await db
      .select({
        userId: schema.users.id,
        orders: sql<number>`count(${schema.orders.id})`,
        totalSpent: sql<number>`coalesce(sum(${schema.orders.totalAmount}), 0)`,
      })
      .from(schema.users)
      .leftJoin(schema.orders, and(
        eq(schema.orders.userId, schema.users.id),
        ne(schema.orders.status, "cancelled")
      ))
      .groupBy(schema.users.id);
  }
}

export const customersReportsRepository = new CustomersReportsRepository();
