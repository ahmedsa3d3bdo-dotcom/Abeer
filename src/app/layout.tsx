import { ReactNode } from "react";

import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";
import { PrintProvider } from "@/components/common/print/print-provider";
import { getPreference } from "@/server/server-actions";
import { settingsRepository } from "@/server/repositories/settings.repository";
import { PreferencesStoreProvider } from "@/stores/preferences/preferences-provider";
import { THEME_MODE_VALUES, THEME_PRESET_VALUES, type ThemePreset, type ThemeMode } from "@/types/preferences/theme";

import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const siteName = (await settingsRepository.findByKey("site_name"))?.value || "";
  const siteDescription = (await settingsRepository.findByKey("site_description"))?.value || "";

  return {
    title: {
      default: siteName,
      template: siteName ? `%s | ${siteName}` : "%s",
    },
    description: siteDescription,
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
