import { api } from "@/lib/storefront/api-client";
import { RelatedProductsClient } from "./related-products.client";

interface RelatedProductsProps {
  productId: string;
}

async function getRelatedProducts(productId: string) {
  try {
    // Note: We need to create this endpoint
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    const res = await fetch(
      `${baseUrl}/api/storefront/products/${productId}/related?limit=4`,
      {
        next: { revalidate: 300 }, // Cache for 5 minutes
      }
    );

    if (!res.ok) {
      throw new Error("Failed to fetch related products");
    }

    const data = await res.json();
    return data.success ? data.data : [];
  } catch (error) {
    console.error("Error fetching related products:", error);
    return [];
  }
}

export async function RelatedProducts({ productId }: RelatedProductsProps) {
  const products = await getRelatedProducts(productId);

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="mt-16">
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight">You May Also Like</h2>
        <p className="text-muted-foreground mt-2">
          Similar products based on this item
        </p>
      </div>
      <RelatedProductsClient products={products} />
    </section>
  );
}
