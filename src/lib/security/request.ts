import { headers } from "next/headers";

/**
 * IP клиента. Доверяем только заголовку X-Real-IP, который выставляет наш обратный прокси (Caddy);
 * X-Forwarded-For клиент может подделать.
 */
export async function clientIp() {
  const h = await headers();
  return (h.get("x-real-ip") ?? "unknown").slice(0, 64);
}
export async function userAgent() {
  return ((await headers()).get("user-agent") ?? "").slice(0, 300);
}
