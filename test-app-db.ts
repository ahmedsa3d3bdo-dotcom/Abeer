import 'dotenv/config';
import { db, checkDatabaseConnection } from './src/shared/db/index';
import { sql } from 'drizzle-orm';

async function testAppDb() {
    console.log('🔄 Testing Shared DB Connection (pg driver)...');

    // 1. Test raw connection
    const isConnected = await checkDatabaseConnection();
    if (isConnected) {
        console.log('✅ checkDatabaseConnection() returned true');
    } else {
        console.error('❌ checkDatabaseConnection() returned false');
        process.exit(1);
    }

    try {
        // 2. Test Drizzle Query
        console.log('🔄 Testing Drizzle Query...');
        const result = await db.execute(sql`SELECT current_user, current_database()`);
        console.log('✅ Query success:', result.rows[0]);

        // 3. Test Product Reviews Query (mimicking the failing one)
        console.log('🔄 Testing Product Reviews Query...');
        const reviews = await db.execute(sql`
      SELECT id FROM product_reviews LIMIT 1
    `);
        console.log('✅ Reviews query success, found:', reviews.rowCount);

        process.exit(0);
    } catch (error) {
        console.error('❌ Query failed:', error);
        process.exit(1);
    }
}

testAppDb();
