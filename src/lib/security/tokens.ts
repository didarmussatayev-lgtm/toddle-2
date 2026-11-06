import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** Криптостойкий случайный токен (256 бит), безопасный для URL и cookie. */
export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");

/** В БД хранится только SHA-256 от токена: утечка таблицы не даёт войти. */
export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}
