import type { MetadataRoute } from "next";
import { headers } from "next/headers";

import { settingsRepository } from "@/server/repositories/settings.repository";
import { siteConfig } from "@/config/site";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const fallbackName = siteConfig.name || "";
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = h.get("x-forwarded-proto") || "https";
  const requestOrigin = host ? `${proto}://${host}` : undefined;
  const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || process.env.APP_URL;
  const baseUrl = (configured || requestOrigin || siteConfig.url || "http://localhost:3000").replace(/\/+$/, "");

  const siteName = (await settingsRepository.findByKey("site_name"))?.value || fallbackName;

  return {
    name: siteName,
    short_name: siteName,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      {
        src: `${baseUrl}/android-chrome-192x192.png`,
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: `${baseUrl}/android-chrome-512x512.png`,
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: `${baseUrl}/android-chrome-512x512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
