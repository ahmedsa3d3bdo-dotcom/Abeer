import { settingsRepository } from "@/server/repositories/settings.repository";

export async function getAppLocaleTimeZone(): Promise<{ locale?: string; timeZone?: string }> {
  const locale = (await settingsRepository.findByKey("app.locale"))?.value || undefined;
  const timeZone = (await settingsRepository.findByKey("app.time_zone"))?.value || undefined;
  return { locale, timeZone };
}

export async function formatInAppTimeZone(
  value: string | number | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions,
  fallback: string = "—",
): Promise<string> {
  if (value == null) return fallback;
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return fallback;

  const { locale, timeZone } = await getAppLocaleTimeZone();

  try {
    return new Intl.DateTimeFormat(locale || undefined, {
      ...(options ?? {}),
      timeZone: timeZone || (options as any)?.timeZone,
    }).format(date);
  } catch {
    return fallback;
  }
}
