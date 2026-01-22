import { siteConfig } from "@/config/site";

type SearchParams = Record<string, string | string[] | undefined>;

type Params = {
  category: string;
};

function getSingle(searchParams: SearchParams | undefined, key: string): string | undefined {
  const v = searchParams?.[key];
  if (Array.isArray(v)) return v[0];
  return v;
}

export default function Head({
  params,
  searchParams,
}: {
  params: Params;
  searchParams?: SearchParams;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || siteConfig.url || "http://localhost:3000";

  const categorySlug = params.category;
  const canonical = `${baseUrl}/shop/${encodeURIComponent(categorySlug)}`;

  const page = parseInt(getSingle(searchParams, "page") || "1");
  const limit = parseInt(getSingle(searchParams, "limit") || "12");
  const sortBy = (getSingle(searchParams, "sortBy") || "newest").toLowerCase();

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
    "categorySlug",
  ]);

  const shouldNoindex =
    (!Number.isNaN(page) && page > 1) ||
    (!Number.isNaN(limit) && limit !== 12) ||
    sortBy !== "newest" ||
    Object.keys(searchParams || {}).some((k) => nonCanonicalKeys.has(k));

  const prevHref = !Number.isNaN(page) && page > 1 ? `${canonical}?page=${page - 1}` : null;
  const nextHref = !Number.isNaN(page) ? `${canonical}?page=${page + 1}` : null;

  return (
    <>
      <link rel="canonical" href={canonical} />
      <meta name="robots" content={shouldNoindex ? "noindex,follow" : "index,follow"} />
      {prevHref ? <link rel="prev" href={prevHref} /> : null}
      {nextHref ? <link rel="next" href={nextHref} /> : null}
    </>
  );
}
