import Link from "next/link";
import Image from "next/image";
import { storefrontCategoriesService } from "@/server/storefront/services/categories.service";

async function getTopCategories() {
  try {
    // Avoid self-fetching API routes during `next build`.
    return await storefrontCategoriesService.getTopLevel(8);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}

export async function CategoryHighlights() {
  const categories = await getTopCategories();

  if (categories.length === 0) {
    return null;
  }

  return (
    <section className="py-12">
      <div className="mb-6 text-left">
        <h2 className="text-3xl font-extrabold tracking-tight">Browse By Category</h2>
        <p className="text-muted-foreground mt-2">
            Most Popular categories just for you
        </p>
      </div>

      {/* Asymmetric mosaic grid sized to fit one screen */}
      <div className="grid grid-cols-2 md:grid-cols-6 grid-flow-dense auto-rows-[120px] md:auto-rows-[140px] lg:auto-rows-[160px] gap-3 md:gap-4">
        {categories.slice(0, 5).map((category: any, i: number) => {
          const pattern = [
            "md:col-span-3 md:row-span-2", // big left
            "md:col-span-3 md:row-span-2", // big right
            "md:col-span-2 md:row-span-1", // small
            "md:col-span-2 md:row-span-1", // small
            "md:col-span-2 md:row-span-1", // small
          ];
          const span = pattern[i] || "md:col-span-2 md:row-span-1";
          return (
            <Link
              key={category.id}
              href={`/shop?categorySlug=${encodeURIComponent(category.slug)}`}
              className={`group relative overflow-hidden rounded-xl border ring-1 ring-border bg-card hover:shadow-lg transition-all ${span}`}
            >
              <div className="absolute inset-0">
                <Image
                  src={category.image || "/placeholder-product.svg"}
                  alt={category.name}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/10 to-black/20" />
              <div className="absolute left-3 top-3 z-10">
                <h3 className="text-white text-lg md:text-xl font-semibold drop-shadow">{category.name}</h3>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
