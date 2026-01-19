import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  // Static routes
  const staticRoutes = [
    "",
    "/shop",
    "/search",
    "/wishlist",
    "/cart",
    "/checkout",
    "/account",
    "/account/orders",
    "/account/profile",
    "/account/addresses",
    "/account/settings",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: route === "" ? 1 : 0.8,
  }));

  // TODO: Add dynamic routes from database
  // - Products: /product/[slug]
  // - Categories: /shop/[category]
  // These would be fetched from your database

  return [...staticRoutes];
}
