/**
 * Простой ограничитель частоты в памяти процесса (скользящее окно).
 * Для одного экземпляра приложения этого достаточно; при нескольких экземплярах
 * дополнительно работает блокировка аккаунта в БД (User.failedLogins / lockedUntil).
 */
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return { ok: false, retryAfterSec: Math.ceil((windowMs - (now - hits[0])) / 1000) };
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 10_000) for (const [k, v] of buckets) if (v.every((t) => now - t >= windowMs)) buckets.delete(k);
  return { ok: true, retryAfterSec: 0 };
}

export function resetRateLimit(key: string) {
  buckets.delete(key);
}

/** Сколько попыток уже учтено по ключу в окне (без добавления новой). */
export function hits(key: string, windowMs: number): number {
  const now = Date.now();
  return (buckets.get(key) ?? []).filter((t) => now - t < windowMs).length;
}

/** Учесть событие (например, неудачный вход) без проверки лимита. */
export function record(key: string) {
  buckets.set(key, [...(buckets.get(key) ?? []), Date.now()]);
}
