
import { storefrontCategoriesRepository } from "../../../server/storefront/repositories/categories.repository";

async function verifyCategoriesQuery() {
    console.log("Verifying categories query...");

    try {
        // Test getTopLevel
        console.log("Testing getTopLevel...");
        const topLevel = await storefrontCategoriesRepository.getTopLevel(8);
        console.log(`getTopLevel success. Found ${topLevel.length} categories.`);

        // Test getBySlug if any category exists
        if (topLevel.length > 0) {
            const slug = topLevel[0].slug;
            console.log(`Testing getBySlug for '${slug}'...`);
            const cat = await storefrontCategoriesRepository.getBySlug(slug);
            console.log("getBySlug success:", !!cat);
        }

    } catch (error) {
        console.error("Categories query verification failed:", error);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

verifyCategoriesQuery();
