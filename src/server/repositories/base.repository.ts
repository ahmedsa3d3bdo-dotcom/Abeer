import { db } from "@/shared/db";
import type { PgTableWithColumns } from "drizzle-orm/pg-core";
import type { BaseRepository, PaginationParams, FilterParams } from "../types";
import { eq } from "drizzle-orm";

/**
 * Base repository with common CRUD operations
 */
export abstract class BaseRepositoryImpl<T extends { id: string }> implements BaseRepository<T> {
  constructor(protected table: PgTableWithColumns<any>) {}

  async findById(id: string): Promise<T | null> {
    const [result] = await db.select().from(this.table).where(eq(this.table.id, id)).limit(1);
    return (result as T) || null;
  }

  async findAll(params?: PaginationParams & FilterParams): Promise<T[]> {
    const { page = 1, limit = 10 } = params || {};
    const offset = (page - 1) * limit;

    const results = await db.select().from(this.table).limit(limit).offset(offset);
    return results as T[];
  }

  async create(data: Partial<T>): Promise<T> {
    const [result] = await db.insert(this.table).values(data).returning();
    return result as T;
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    const [result] = await db.update(this.table).set(data).where(eq(this.table.id, id)).returning();
    return result as T;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(this.table).where(eq(this.table.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async count(): Promise<number> {
    const [result] = await db.select({ count: db.$count(this.table) }).from(this.table);
    return result?.count || 0;
  }
}
