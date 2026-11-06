"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { config } from "@/lib/config";
import { createSession, destroySession, getSessionUserId } from "@/lib/session";
import { verifyPassword } from "@/lib/security/password";
import { rateLimit, resetRateLimit, hits, record } from "@/lib/security/rate-limit";
import { clientIp } from "@/lib/security/request";
import { LOCALES } from "@/lib/i18n-dict";

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

async function audit(action: string, actorId: string | null, meta: Record<string, unknown>) {
  const school = await db.school.findFirst({ select: { id: true } });
  if (school) await db.auditLog.create({ data: { schoolId: school.id, actorId, action, entityType: "User", entityId: actorId, meta: meta as object } });
}

const LoginSchema = z.object({ email: z.string().trim().toLowerCase().email().max(200), password: z.string().min(1).max(200) });

/** Вход по email и паролю. Ошибка всегда одна и та же, чтобы не раскрывать, существует ли email. */
export async function loginWithPassword(formData: FormData) {
  const parsed = LoginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) redirect("/login?error=invalid");
  const { email, password } = parsed.data;
  const ip = await clientIp();

  if (!rateLimit(`ip:${ip}`, 30, 15 * 60_000).ok || !rateLimit(`email:${email}`, 10, 15 * 60_000).ok) {
    await audit("LOGIN_RATE_LIMITED", null, { email, ip });
    redirect("/login?error=rate");
  }

  const user = await db.user.findFirst({ where: { email: { equals: email, mode: "insensitive" }, deletedAt: null } });
  // Блокировка после MAX_FAILED ошибок выглядит одинаково и для существующих, и для несуществующих email
  // (иначе по ответу «заблокировано» можно было бы узнать, зарегистрирован ли адрес)
  const lockedInMemory = hits(`fail:${email}`, LOCK_MINUTES * 60_000) >= MAX_FAILED;
  if ((user?.lockedUntil && user.lockedUntil > new Date()) || (!user && lockedInMemory)) {
    await verifyPassword(null, password); // одинаковое время ответа
    redirect("/login?error=locked");
  }
  const ok = await verifyPassword(user?.passwordHash, password);
  if (!user || !ok || user.status !== "ACTIVE") {
    if (user) {
      const failed = user.failedLogins + 1;
      await db.user.update({
        where: { id: user.id },
        data: { failedLogins: failed >= MAX_FAILED ? 0 : failed, lockedUntil: failed >= MAX_FAILED ? new Date(Date.now() + LOCK_MINUTES * 60_000) : user.lockedUntil },
      });
      if (failed >= MAX_FAILED) await audit("ACCOUNT_LOCKED", user.id, { email, ip, minutes: LOCK_MINUTES });
    }
    if (!user) record(`fail:${email}`);
    await audit("LOGIN_FAILED", user?.id ?? null, { email, ip });
    redirect("/login?error=invalid");
  }
  await db.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });
  resetRateLimit(`email:${email}`);
  resetRateLimit(`fail:${email}`);
  await createSession(user.id);
  await audit("LOGIN_SUCCESS", user.id, { method: "password", ip });
  redirect("/");
}

/** Демо-вход без пароля: работает только при DEMO_MODE=true (демо-стенд с вымышленными данными). */
export async function loginAs(formData: FormData) {
  if (!config.demoMode) redirect("/login");
  const userId = z.string().uuid().safeParse(formData.get("userId"));
  if (!userId.success) redirect("/login");
  const user = await db.user.findFirst({ where: { id: userId.data, status: "ACTIVE", deletedAt: null } });
  if (!user) redirect("/login");
  await createSession(user.id);
  redirect("/");
}

export async function logout() {
  const uid = await getSessionUserId();
  await destroySession();
  if (uid) await audit("LOGOUT", uid, {});
  redirect("/login");
}

export async function setLocale(formData: FormData) {
  const l = String(formData.get("locale"));
  if ((LOCALES as readonly string[]).includes(l)) (await cookies()).set("locale", l, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", secure: config.cookieSecure });
  const back = String(formData.get("back") ?? "/");
  // только относительные пути внутри сайта (защита от open redirect вида //evil.com)
  redirect(/^\/(?!\/)[\w\-/.?=&%]*$/.test(back) ? back : "/");
}
