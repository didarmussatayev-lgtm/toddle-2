export const SCHOOL_TZ = "Asia/Almaty";

/** Сегодняшняя дата в часовом поясе школы, YYYY-MM-DD */
export function todayIso(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: SCHOOL_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
export const isoToDate = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
export const dateToIso = (d: Date) => d.toISOString().slice(0, 10);
export const addDays = (iso: string, n: number) => dateToIso(new Date(isoToDate(iso).getTime() + n * 86400000));
export const isIso = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

const localeTag = { ru: "ru-RU", kk: "kk-KZ", en: "en-GB" } as const;
export function fmtDate(d: Date | string | null | undefined, locale: "ru" | "kk" | "en", opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) {
  if (!d) return "—";
  const date = typeof d === "string" ? isoToDate(d) : d;
  return new Intl.DateTimeFormat(localeTag[locale], { timeZone: SCHOOL_TZ, ...opts }).format(date);
}
export function fmtDateTime(d: Date | null | undefined, locale: "ru" | "kk" | "en") {
  return fmtDate(d, locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
