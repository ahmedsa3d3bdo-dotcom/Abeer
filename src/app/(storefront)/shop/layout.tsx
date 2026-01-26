import type { Metadata } from "next";

type SearchParams = Record<string, string | string[] | undefined>;

function getSingle(searchParams: SearchParams | undefined, key: string): string | undefined {
  const v = searchParams?.[key];
  if (Array.isArray(v)) return v[0];
  return v;
}

function getAll(searchParams: SearchParams | undefined, key: string): string[] {
  const v = searchParams?.[key];
  if (!v) return [];
  return Array.isArray(v) ? v.filter(Boolean) : [v].filter(Boolean);
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ category?: string }>;
  searchParams?: Promise<SearchParams>;
}): Promise<Metadata> {
  const p = await params;
  const sp = (await searchParams) || undefined;

  const pathCategory = p?.category ? String(p.category) : undefined;
  const categorySlugs = getAll(sp, "categorySlug");

  const canonicalPath = pathCategory
    ? `/shop/${encodeURIComponent(pathCategory)}`
    : categorySlugs.length === 1
      ? `/shop/${encodeURIComponent(categorySlugs[0])}`
      : "/shop";

  const page = parseInt(getSingle(sp, "page") || "1");
  const limit = parseInt(getSingle(sp, "limit") || "12");
  const sortBy = (getSingle(sp, "sortBy") || "newest").toLowerCase();

  const nonCanonicalKeys = new Set([
    "q",
    "search",
    "minPrice",
    "maxPrice",
    "minRating",
    "inStock",
    "onSale",
    "isFeatured",
    "categoryId",
  ]);

  const shouldNoindex =
    categorySlugs.length > 1 ||
    (!Number.isNaN(page) && page > 1) ||
    (!Number.isNaN(limit) && limit !== 12) ||
    sortBy !== "newest" ||
    Object.keys(sp || {}).some((k) => nonCanonicalKeys.has(k));

  const title = pathCategory ? `Shop: ${pathCategory}` : "Shop";
  const description = "Browse products, discover new arrivals, and filter by category, price, and offers.";

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    robots: shouldNoindex ? { index: false, follow: true } : { index: true, follow: true },
  };
}

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children;
}
