"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { config } from "@/lib/config";
import { requireUser } from "@/lib/auth";
import { isSchoolAdmin } from "@/lib/access";
import { randomToken, sha256 } from "@/lib/security/tokens";
import { hashPassword, passwordProblem } from "@/lib/security/password";
import { createSession, revokeAllSessions } from "@/lib/session";
import { rateLimit } from "@/lib/security/rate-limit";
import { clientIp } from "@/lib/security/request";

const INVITE_HOURS = 72;
const Uuid = z.string().uuid();

async function requireAdmin() {
  const u = await requireUser();
  if (!isSchoolAdmin(u)) throw new Error("forbidden");
  return u;
}
async function audit(schoolId: string, actorId: string | null, action: string, entityId: string, meta: Record<string, unknown> = {}) {
  await db.auditLog.create({ data: { schoolId, actorId, action, entityType: "User", entityId, meta: meta as object } });
}

export type InviteState = { link?: string; expiresAt?: string; error?: string };

/** Создать одноразовую ссылку для установки пароля (старые неиспользованные ссылки аннулируются). Ссылка показывается один раз. */
export async function createInviteLink(_prev: InviteState, formData: FormData): Promise<InviteState> {
  const admin = await requireAdmin();
  const userId = Uuid.safeParse(formData.get("userId"));
  if (!userId.success) return { error: "Неверный пользователь" };
  const user = await db.user.findFirst({ where: { id: userId.data, schoolId: admin.schoolId, deletedAt: null } });
  if (!user) return { error: "Пользователь не найден" };
  if (user.status === "DISABLED") return { error: "Доступ пользователя заблокирован — сначала разблокируйте" };
  const token = randomToken();
  const expiresAt = new Date(Date.now() + INVITE_HOURS * 3600_000);
  await db.$transaction([
    db.loginToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } }),
    db.loginToken.create({ data: { userId: user.id, tokenHash: sha256(token), purpose: user.passwordHash ? "RESET" : "INVITE", expiresAt, createdById: admin.id } }),
  ]);
  await audit(admin.schoolId, admin.id, "INVITE_LINK_CREATED", user.id, { email: user.email, hours: INVITE_HOURS });
  return { link: `${config.appUrl}/invite/${token}`, expiresAt: expiresAt.toISOString() };
}

/** Заблокировать / разблокировать доступ: блокировка сразу завершает все сессии. */
export async function setAccess(formData: FormData) {
  const admin = await requireAdmin();
  const userId = Uuid.parse(formData.get("userId"));
  const enable = formData.get("enable") === "1";
  if (userId === admin.id && !enable) throw new Error("Нельзя заблокировать самого себя");
  const user = await db.user.findFirstOrThrow({ where: { id: userId, schoolId: admin.schoolId } });
  await db.user.update({ where: { id: user.id }, data: { status: enable ? "ACTIVE" : "DISABLED", failedLogins: 0, lockedUntil: null } });
  if (!enable) {
    await revokeAllSessions(user.id);
    await db.loginToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } });
  }
  await audit(admin.schoolId, admin.id, enable ? "ACCESS_ENABLED" : "ACCESS_DISABLED", user.id, { email: user.email });
  revalidatePath(`/admin/people/${user.id}`);
  redirect(`/admin/people/${user.id}`);
}

export async function revokeSessions(formData: FormData) {
  const admin = await requireAdmin();
  const userId = Uuid.parse(formData.get("userId"));
  const user = await db.user.findFirstOrThrow({ where: { id: userId, schoolId: admin.schoolId } });
  const { count } = await revokeAllSessions(user.id);
  await audit(admin.schoolId, admin.id, "SESSIONS_REVOKED", user.id, { email: user.email, count });
  redirect(`/admin/people/${user.id}`);
}

/** Установка пароля по ссылке-приглашению. */
export async function setPasswordWithToken(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const back = (code: string) => redirect(`/invite/${encodeURIComponent(token)}?error=${code}`);
  if (!rateLimit(`invite:${await clientIp()}`, 20, 15 * 60_000).ok) back("rate");
  const lt = token.length <= 100 ? await db.loginToken.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } }) : null;
  if (!lt || lt.usedAt || lt.expiresAt < new Date() || lt.user.status === "DISABLED" || lt.user.deletedAt) redirect("/invite/expired");
  if (password !== confirm) back("mismatch");
  const problem = passwordProblem(password, lt!.user.email);
  if (problem) back(problem);
  const user = lt!.user;
  // Пометить ссылку использованной атомарно: повторное использование той же ссылки невозможно
  const { count } = await db.loginToken.updateMany({ where: { id: lt!.id, usedAt: null }, data: { usedAt: new Date() } });
  if (count !== 1) redirect("/invite/expired");
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(password), passwordChangedAt: new Date(), status: "ACTIVE", failedLogins: 0, lockedUntil: null } });
  await revokeAllSessions(user.id);
  await audit(user.schoolId, user.id, "PASSWORD_SET", user.id, { purpose: lt!.purpose });
  await createSession(user.id);
  redirect("/");
}
