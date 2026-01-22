import { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { siteConfig } from "@/config/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const getRequestOrigin = async () => {
    const h = await headers();
    const host = h.get("x-forwarded-host") || h.get("host");
    if (!host) return undefined;
    const proto = h.get("x-forwarded-proto") || "https";
    return `${proto}://${host}`;
  };

  const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || process.env.APP_URL;
  const baseUrl = (configured || (await getRequestOrigin()) || siteConfig.url || "http://localhost:3000").replace(/\/+$/, "");

  // Static routes
  const staticRoutes = [
    "",
    "/shop",
    "/shop/new",
    "/shop/featured",
    "/shop/sale",
    "/contact",
    "/faq",
    "/shipping",
    "/returns",
    "/privacy",
    "/terms",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: route === "" ? 1 : 0.8,
  }));

  const [products, categories] = await Promise.all([
    db
      .select({ slug: schema.products.slug, updatedAt: schema.products.updatedAt })
      .from(schema.products)
      .where(eq(schema.products.status, "active")),
    db
      .select({ slug: schema.categories.slug, updatedAt: schema.categories.updatedAt })
      .from(schema.categories)
      .where(eq(schema.categories.isActive, true)),
  ]);

  const productRoutes = products.map((p) => ({
    url: `${baseUrl}/product/${p.slug}`,
    lastModified: p.updatedAt || new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const categoryRoutes = categories.map((c) => ({
    url: `${baseUrl}/shop/${encodeURIComponent(c.slug)}`,
    lastModified: c.updatedAt || new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
