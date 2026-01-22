import { MetadataRoute } from "next";
import { headers } from "next/headers";
import { siteConfig } from "@/config/site";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const getRequestOrigin = async () => {
    const h = await headers();
    const host = h.get("x-forwarded-host") || h.get("host");
    if (!host) return undefined;
    const proto = h.get("x-forwarded-proto") || "https";
    return `${proto}://${host}`;
  };

  const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || process.env.APP_URL;
  const baseUrl = (configured || (await getRequestOrigin()) || siteConfig.url || "http://localhost:3000").replace(/\/+$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/account/",
          "/checkout/",
          "/cart/",
          "/wishlist/",
          "/order/",
          "/search",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
