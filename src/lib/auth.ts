import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";

/**
 * ДЕМО-аутентификация: id пользователя в httpOnly-cookie.
 * В рабочей версии заменяется на Auth.js + Google Workspace (модели AuthAccount/AuthSession уже в схеме).
 */
export const SESSION_COOKIE = "demo_uid";

export async function getCurrentUser() {
  const uid = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!uid) return null;
  return loadUser(uid);
}

export async function loadUser(uid: string) {
  const user = await db.user.findFirst({
    where: { id: uid, deletedAt: null, status: "ACTIVE" },
    include: {
      roles: { include: { programme: true } },
      staffProfile: true,
      studentProfile: true,
      guardianProfile: { include: { students: { where: { approved: true }, include: { student: { include: { user: true } } } } } },
    },
  });
  return user;
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof loadUser>>>;

export async function requireUser() {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  return u;
}

export function fullName(u: { firstName: string; lastName: string }) {
  return `${u.lastName} ${u.firstName}`;
}
