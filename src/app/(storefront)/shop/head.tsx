import { siteConfig } from "@/config/site";
import { headers } from "next/headers";

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

export default async function Head({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = h.get("x-forwarded-proto") || "https";
  const requestOrigin = host ? `${proto}://${host}` : undefined;
  const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || process.env.APP_URL;
  const baseUrl = (configured || requestOrigin || siteConfig.url || "http://localhost:3000").replace(/\/+$/, "");

  const categorySlugs = getAll(searchParams, "categorySlug");
  const canonicalBase =
    categorySlugs.length === 1
      ? `${baseUrl}/shop/${encodeURIComponent(categorySlugs[0])}`
      : `${baseUrl}/shop`;
  const canonical = canonicalBase;

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
  ]);

  const shouldNoindex =
    categorySlugs.length > 1 ||
    (!Number.isNaN(page) && page > 1) ||
    (!Number.isNaN(limit) && limit !== 12) ||
    sortBy !== "newest" ||
    Object.keys(searchParams || {}).some((k) => nonCanonicalKeys.has(k));

  const prevHref = !Number.isNaN(page) && page > 1 ? `${canonicalBase}?page=${page - 1}` : null;
  const nextHref = !Number.isNaN(page) ? `${canonicalBase}?page=${page + 1}` : null;

  return (
    <>
      <link rel="canonical" href={canonical} />
      <meta name="robots" content={shouldNoindex ? "noindex,follow" : "index,follow"} />
      {prevHref ? <link rel="prev" href={prevHref} /> : null}
      {nextHref ? <link rel="next" href={nextHref} /> : null}
    </>
  );
}
