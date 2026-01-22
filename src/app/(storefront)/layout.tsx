import type { Metadata } from "next";
import Script from "next/script";
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
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || siteConfig.url || "http://localhost:3000";

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
      icon: "/Storefront/images/Logo.png",
      shortcut: "/Storefront/images/Logo.png",
      apple: "/Storefront/images/Logo.png",
    },
    openGraph: {
      type: "website",
      url: baseUrl,
      title: siteName,
      description: siteDescription,
      siteName,
      images: [
        {
          url: `${baseUrl}/Storefront/images/Logo.png`,
          alt: siteName,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: siteName,
      description: siteDescription,
      images: [`${baseUrl}/Storefront/images/Logo.png`],
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
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || siteConfig.url || "http://localhost:3000";

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
                    logo: `${baseUrl}/Storefront/images/Logo.png`,
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
