import { notFound } from "next/navigation";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s: unknown): s is string => typeof s === "string" && UUID.test(s);

/** Параметр маршрута должен быть UUID, иначе 404 (а не ошибка БД). */
export function uuidOr404(s: string): string {
  if (!isUuid(s)) notFound();
  return s;
}

/** Обрезка пользовательского текста до разумной длины. */
export const clip = (s: unknown, max: number) => String(s ?? "").trim().slice(0, max);
