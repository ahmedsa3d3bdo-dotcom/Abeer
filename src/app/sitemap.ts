import { MetadataRoute } from "next";
import { eq } from "drizzle-orm";

import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

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
