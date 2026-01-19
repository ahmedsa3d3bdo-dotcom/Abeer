
import { db } from "../index";
import { sql } from "drizzle-orm";

async function verifyCategories() {
    console.log("Verifying categories schema...");

    try {
        // Check categories table columns
        const columns = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'categories';
    `);

        const columnNames = columns.rows.map((r: Record<string, unknown>) => r.column_name as string);
        console.log("Categories table columns:", columnNames);

        const requiredColumns = ['id', 'name', 'slug', 'description', 'image', 'parent_id', 'sort_order', 'is_active'];
        const missingColumns = requiredColumns.filter(c => !columnNames.includes(c));

        if (missingColumns.length > 0) {
            console.error("MISSING COLUMNS in categories:", missingColumns);
        } else {
            console.log("All required columns present in categories table.");
        }

        // Check product_categories table
        const pcTable = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'product_categories'
      );
    `);

        console.log("product_categories table exists:", pcTable.rows[0].exists);

    } catch (error: unknown) {
        console.error("Verification failed:", error);
    } finally {
        process.exit(0);
    }
}

verifyCategories();
