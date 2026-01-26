import { ReactNode } from "react";

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";

import { Toaster } from "@/components/ui/sonner";
import { PrintProvider } from "@/components/common/print/print-provider";
import { getPreference } from "@/server/server-actions";
import { settingsRepository } from "@/server/repositories/settings.repository";
import { PreferencesStoreProvider } from "@/stores/preferences/preferences-provider";
import { THEME_MODE_VALUES, THEME_PRESET_VALUES, type ThemePreset, type ThemeMode } from "@/types/preferences/theme";
import { siteConfig } from "@/config/site";

import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

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
      template: siteName ? `%s | ${siteName}` : "%s",
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
          url: `${baseUrl}/Storefront/images/abeershop_hero.png`,
          alt: siteName,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: siteName,
      description: siteDescription,
      images: [`${baseUrl}/Storefront/images/abeershop_hero.png`],
    },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const configuredThemeModeRaw = (await settingsRepository.findByKey("storefront_theme_mode"))?.value;
  const configuredThemePresetRaw = (await settingsRepository.findByKey("storefront_theme_preset"))?.value;

  const configuredThemeMode = THEME_MODE_VALUES.includes(configuredThemeModeRaw as ThemeMode)
    ? (configuredThemeModeRaw as ThemeMode)
    : "light";
  const configuredThemePreset = THEME_PRESET_VALUES.includes(configuredThemePresetRaw as ThemePreset)
    ? (configuredThemePresetRaw as ThemePreset)
    : "default";

  const themeMode = await getPreference<ThemeMode>("theme_mode", THEME_MODE_VALUES, configuredThemeMode);
  const themePreset = await getPreference<ThemePreset>("theme_preset", THEME_PRESET_VALUES, configuredThemePreset);

  return (
    <html
      lang="en"
      className={themeMode === "dark" ? "dark" : ""}
      data-theme-preset={themePreset}
      suppressHydrationWarning
    >
      <body className={`${inter.className} min-h-screen antialiased`}>
        <PreferencesStoreProvider themeMode={themeMode} themePreset={themePreset}>
          <PrintProvider>
            {children}
            <Toaster />
          </PrintProvider>
        </PreferencesStoreProvider>
      </body>
    </html>
  );
}
