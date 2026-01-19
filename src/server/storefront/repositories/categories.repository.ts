import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";

/**
 * Storefront Categories Repository
 * Handles data access for customer-facing category queries
 */

export class StorefrontCategoriesRepository {
  /**
   * Get category tree with product counts
   * Returns hierarchical structure for navigation
   */
  async getTree() {
    const categories = await db
      .select({
        id: schema.categories.id,
        name: schema.categories.name,
        slug: schema.categories.slug,
        description: schema.categories.description,
        image: schema.categories.image,
        parentId: schema.categories.parentId,
        sortOrder: schema.categories.sortOrder,
        productCount: sql<number>`count(distinct ${schema.productCategories.productId})::int`,
      })
      .from(schema.categories)
      .leftJoin(
        schema.productCategories,
        eq(schema.productCategories.categoryId, schema.categories.id)
      )
      .where(eq(schema.categories.isActive, true))
      .groupBy(
        schema.categories.id,
        schema.categories.name,
        schema.categories.slug,
        schema.categories.description,
        schema.categories.image,
        schema.categories.parentId,
        schema.categories.sortOrder
      )
      .orderBy(schema.categories.sortOrder, schema.categories.name);

    // Build hierarchical structure
    return this.buildTree(categories);
  }

  /**
   * Get category by slug with details
   */
  async getBySlug(slug: string) {
    const [category] = await db
      .select({
        id: schema.categories.id,
        name: schema.categories.name,
        slug: schema.categories.slug,
        description: schema.categories.description,
        image: schema.categories.image,
        parentId: schema.categories.parentId,
        productCount: sql<number>`count(distinct ${schema.productCategories.productId})::int`,
      })
      .from(schema.categories)
      .leftJoin(
        schema.productCategories,
        eq(schema.productCategories.categoryId, schema.categories.id)
      )
      .where(
        and(
          eq(schema.categories.slug, slug),
          eq(schema.categories.isActive, true)
        )
      )
      .groupBy(
        schema.categories.id,
        schema.categories.name,
        schema.categories.slug,
        schema.categories.description,
        schema.categories.image,
        schema.categories.parentId
      )
      .limit(1);

    if (!category) {
      return null;
    }

    // Get subcategories if any
    const subcategories = await db
      .select({
        id: schema.categories.id,
        name: schema.categories.name,
        slug: schema.categories.slug,
        image: schema.categories.image,
        productCount: sql<number>`count(distinct ${schema.productCategories.productId})::int`,
      })
      .from(schema.categories)
      .leftJoin(
        schema.productCategories,
        eq(schema.productCategories.categoryId, schema.categories.id)
      )
      .where(
        and(
          eq(schema.categories.parentId, category.id),
          eq(schema.categories.isActive, true)
        )
      )
      .groupBy(
        schema.categories.id,
        schema.categories.name,
        schema.categories.slug,
        schema.categories.image
      )
      .orderBy(schema.categories.sortOrder, schema.categories.name);

    return {
      ...category,
      subcategories,
    };
  }

  /**
   * Get top-level categories for homepage/navigation
   * Counts products recursively including all subcategories
   */
  async getTopLevel(limit = 8) {
    // Use a recursive CTE to get all descendant category IDs for each top-level category
    // Then count products in all those categories
    const categories = await db.execute(sql`
      WITH RECURSIVE category_tree AS (
        -- Base case: top-level categories (no parent)
        SELECT 
          id,
          id as root_id,
          name,
          slug,
          description,
          image,
          sort_order,
          is_active
        FROM categories
        WHERE parent_id IS NULL AND is_active = true
        
        UNION ALL
        
        -- Recursive case: get children, keeping track of the root
        SELECT 
          c.id,
          ct.root_id,
          c.name,
          c.slug,
          c.description,
          c.image,
          c.sort_order,
          c.is_active
        FROM categories c
        INNER JOIN category_tree ct ON c.parent_id = ct.id
        WHERE c.is_active = true
      ),
      product_counts AS (
        SELECT 
          ct.root_id,
          COUNT(DISTINCT pc.product_id) as product_count
        FROM category_tree ct
        LEFT JOIN product_categories pc ON pc.category_id = ct.id
        GROUP BY ct.root_id
      )
      SELECT 
        c.id,
        c.name,
        c.slug,
        c.description,
        c.image,
        COALESCE(pc.product_count, 0)::int as "productCount"
      FROM categories c
      LEFT JOIN product_counts pc ON pc.root_id = c.id
      WHERE c.parent_id IS NULL AND c.is_active = true
      ORDER BY c.sort_order, c.name
      LIMIT ${limit}
    `);

    return categories.rows as Array<{
      id: string;
      name: string;
      slug: string;
      description: string | null;
      image: string | null;
      productCount: number;
    }>;
  }

  /**
   * Search categories by name (case-insensitive, partial match)
   * Intended for autocomplete suggestions
   */
  async searchByNameLike(query: string, limit = 6) {
    const like = `%${query}%`;
    const rows = await db
      .select({
        id: schema.categories.id,
        name: schema.categories.name,
        slug: schema.categories.slug,
      })
      .from(schema.categories)
      .where(and(eq(schema.categories.isActive, true), sql`${schema.categories.name} ilike ${like}` as any))
      .orderBy(schema.categories.sortOrder, schema.categories.name)
      .limit(limit);

    return rows;
  }

  /**
   * Build hierarchical tree structure from flat array
   */
  private buildTree(categories: any[]) {
    const map = new Map();
    const roots: any[] = [];

    // First pass: create map of all categories
    categories.forEach((cat) => {
      map.set(cat.id, { ...cat, children: [] });
    });

    // Second pass: build tree structure
    categories.forEach((cat) => {
      const node = map.get(cat.id);
      if (cat.parentId) {
        const parent = map.get(cat.parentId);
        if (parent) {
          parent.children.push(node);
        } else {
          roots.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    return roots;
  }
}

export const storefrontCategoriesRepository =
  new StorefrontCategoriesRepository();
