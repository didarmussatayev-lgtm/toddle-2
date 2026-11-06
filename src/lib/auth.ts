import { cache } from "react";
import { redirect } from "next/navigation";
import { db } from "./db";
import { getSessionUserId } from "./session";

/**
 * Текущий пользователь по серверной сессии (таблица AuthSession, в cookie — случайный токен).
 * Вход: Google (src/app/auth/google), пароль по приглашению или демо-вход (только DEMO_MODE=true).
 */
export const getCurrentUser = cache(async () => {
  const uid = await getSessionUserId();
  if (!uid) return null;
  return loadUser(uid);
});

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
