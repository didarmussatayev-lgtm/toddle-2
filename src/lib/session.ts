import { cache } from "react";
import { cookies } from "next/headers";
import { db } from "./db";
import { config } from "./config";
import { randomToken, sha256 } from "./security/tokens";
import { clientIp, userAgent } from "./security/request";

/** __Host- префикс: cookie только по HTTPS, только для этого хоста, path=/ (защита от подмены с поддоменов). */
export const SESSION_COOKIE = config.cookieSecure ? "__Host-sid" : "sid";
export const SESSION_COOKIE_NAMES = ["__Host-sid", "sid"];

export async function createSession(userId: string) {
  // Прежний сеанс этого браузера удаляется: новый вход всегда получает новый токен (защита от фиксации сеанса)
  const previous = (await cookies()).get(SESSION_COOKIE)?.value;
  if (previous && previous.length <= 100) await db.authSession.deleteMany({ where: { sessionToken: sha256(previous) } });
  const token = randomToken();
  const expires = new Date(Date.now() + config.sessionDays * 86400_000);
  await db.authSession.create({
    data: { userId, sessionToken: sha256(token), expires, ip: await clientIp(), userAgent: await userAgent() },
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true, secure: config.cookieSecure, sameSite: "lax", path: "/", expires,
  });
  await db.user.update({ where: { id: userId }, data: { lastActiveAt: new Date() } });
}

/** id пользователя по cookie сессии (одна проверка на запрос благодаря cache). */
export const getSessionUserId = cache(async (): Promise<string | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const s = await db.authSession.findUnique({ where: { sessionToken: sha256(token) } });
  if (!s) return null;
  const now = Date.now();
  if (s.expires.getTime() < now || now - s.lastSeenAt.getTime() > config.sessionIdleHours * 3600_000) {
    await db.authSession.delete({ where: { id: s.id } }).catch(() => undefined);
    return null;
  }
  if (now - s.lastSeenAt.getTime() > 5 * 60_000) {
    await db.authSession.update({ where: { id: s.id }, data: { lastSeenAt: new Date() } }).catch(() => undefined);
  }
  return s.userId;
});

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.authSession.deleteMany({ where: { sessionToken: sha256(token) } });
  jar.delete(SESSION_COOKIE);
}

/** Завершить все сессии пользователя (смена пароля, блокировка). */
export const revokeAllSessions = (userId: string) => db.authSession.deleteMany({ where: { userId } });
