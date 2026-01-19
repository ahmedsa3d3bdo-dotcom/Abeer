
import { db } from "../index";
import { sql } from "drizzle-orm";

async function verify() {
    console.log("Verifying database schema...");

    try {
        // Check products table columns
        const productsColumns = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'products';
    `);

        const columnNames = productsColumns.rows.map((r: Record<string, unknown>) => r.column_name as string);
        console.log("Products table columns:", columnNames);

        const requiredColumns = ['view_count', 'sold_count', 'average_rating', 'review_count'];
        const missingColumns = requiredColumns.filter(c => !columnNames.includes(c));

        if (missingColumns.length > 0) {
            console.error("MISSING COLUMNS in products:", missingColumns);
        } else {
            console.log("All required columns present in products table.");
        }

        // Check wishlist_items table
        const wishlistTable = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'wishlist_items'
      );
    `);

        console.log("wishlist_items table exists:", wishlistTable.rows[0].exists);

        // Check connection by counting products
        const productCount = await db.execute(sql`SELECT count(*) FROM products`);
        console.log("Product count:", productCount.rows[0].count);

    } catch (error: unknown) {
        console.error("Verification failed:", error);
    } finally {
        process.exit(0);
    }
}

verify();
