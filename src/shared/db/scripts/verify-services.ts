
import { recommendationsService } from "../../../server/storefront/services/recommendations.service";

async function verifyServices() {
    console.log("Verifying services...");

    try {
        // Test Recommendations Service
        console.log("Testing recommendationsService.forProduct...");
        const recsProduct = await recommendationsService.forProduct("non-existent-id");
        console.log("forProduct result (should be empty array):", recsProduct);

        console.log("Testing recommendationsService.forCart...");
        const recsCart = await recommendationsService.forCart("non-existent-cart");
        console.log("forCart result (should be fallback):", recsCart.length > 0 ? "Got items" : "Empty");

        console.log("Testing recommendationsService.forUser...");
        // Mock auth? It uses auth() internally which might fail in script.
        // The service uses `auth()` which imports from `@/auth`. This might be hard to run in standalone script.
        // However, we wrapped it in try-catch, so it should return empty array or fallback instead of throwing.
        const recsUser = await recommendationsService.forUser();
        console.log("forUser result (should be fallback or empty):", recsUser.length > 0 ? "Got items" : "Empty");

    } catch (error: unknown) {
        console.error("Service verification failed:", error);
    } finally {
        process.exit(0);
    }
}

verifyServices();
