import type { Metadata } from "next";
import Script from "next/script";
import { headers } from "next/headers";
import { StorefrontHeader } from "@/components/storefront/layout/header";
import { StorefrontFooter } from "@/components/storefront/layout/footer";
import { QueryProvider } from "@/components/storefront/providers/query-provider";
import { AuthProvider } from "@/components/storefront/providers/auth-provider";
import { CartProvider } from "@/components/storefront/providers/cart-provider";
import { settingsRepository } from "@/server/repositories/settings.repository";
import { siteConfig } from "@/config/site";
import { THEME_MODE_VALUES, THEME_PRESET_VALUES, type ThemeMode, type ThemePreset } from "@/types/preferences/theme";

export async function generateMetadata(): Promise<Metadata> {
  const fallbackName = siteConfig.name || "";
  const fallbackDescription = siteConfig.description || "";
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = h.get("x-forwarded-proto") || "https";
  const requestOrigin = host ? `${proto}://${host}` : undefined;
  const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || process.env.APP_URL;
  const baseUrl = (configured || requestOrigin || siteConfig.url || "http://localhost:3000").replace(/\/+$/, "");

  const siteName = (await settingsRepository.findByKey("site_name"))?.value || fallbackName;
  const siteDescription = (await settingsRepository.findByKey("site_description"))?.value || fallbackDescription;

  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: siteName,
      template: `%s | ${siteName}`,
    },
    description: siteDescription,
    icons: {
      icon: [
        { url: "/favicon-96x96.png", type: "image/png", sizes: "96x96" },
        { url: "/favicon-48x48.png", type: "image/png", sizes: "48x48" },
        { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
        { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
        { url: "/favicon.ico" },
      ],
      shortcut: [
        { url: "/favicon-48x48.png", type: "image/png", sizes: "48x48" },
        { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
        { url: "/favicon.ico" },
      ],
      apple: [{ url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" }],
    },
    manifest: "/manifest.webmanifest",
    openGraph: {
      type: "website",
      url: baseUrl,
      title: siteName,
      description: siteDescription,
      siteName,
      images: [
        {
          url: `${baseUrl}/logo.png`,
          alt: siteName,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: siteName,
      description: siteDescription,
      images: [`${baseUrl}/logo.png`],
    },
  };
}

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const configuredThemeModeRaw = (await settingsRepository.findByKey("storefront_theme_mode"))?.value;
  const configuredThemePresetRaw = (await settingsRepository.findByKey("storefront_theme_preset"))?.value;
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = h.get("x-forwarded-proto") || "https";
  const requestOrigin = host ? `${proto}://${host}` : undefined;
  const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || process.env.APP_URL;
  const baseUrl = (configured || requestOrigin || siteConfig.url || "http://localhost:3000").replace(/\/+$/, "");

  const configuredThemeMode = THEME_MODE_VALUES.includes(configuredThemeModeRaw as ThemeMode)
    ? (configuredThemeModeRaw as ThemeMode)
    : "light";
  const configuredThemePreset = THEME_PRESET_VALUES.includes(configuredThemePresetRaw as ThemePreset)
    ? (configuredThemePresetRaw as ThemePreset)
    : "default";

  return (
    <AuthProvider>
      <QueryProvider>
        <CartProvider>
          <Script
            id="storefront-theme"
            strategy="beforeInteractive"
            dangerouslySetInnerHTML={{
              __html: `(()=>{try{var d=document.documentElement;d.setAttribute('data-theme-preset',${JSON.stringify(
                configuredThemePreset,
              )});if(${JSON.stringify(configuredThemeMode)}==='dark'){d.classList.add('dark')}else{d.classList.remove('dark')}}catch(e){}})();`,
            }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@graph": [
                  {
                    "@type": "Organization",
                    "@id": `${baseUrl}/#organization`,
                    name: siteConfig.name,
                    url: baseUrl,
                    logo: `${baseUrl}/logo.png`,
                  },
                  {
                    "@type": "WebSite",
                    "@id": `${baseUrl}/#website`,
                    url: baseUrl,
                    name: siteConfig.name,
                    description: siteConfig.description,
                    publisher: {
                      "@id": `${baseUrl}/#organization`,
                    },
                  },
                ],
              }),
            }}
          />
          <div className="flex min-h-screen flex-col overflow-x-clip">
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
            >
              Skip to content
            </a>
            <StorefrontHeader />
            <main id="main-content" role="main" tabIndex={-1} className="flex-1">
              <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
                {children}
              </div>
            </main>
            <StorefrontFooter />
          </div>
        </CartProvider>
      </QueryProvider>
    </AuthProvider>
  );
}
