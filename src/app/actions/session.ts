"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { SESSION_COOKIE } from "@/lib/auth";
import { LOCALES } from "@/lib/i18n-dict";

export async function loginAs(formData: FormData) {
  if (process.env.DEMO_LOGIN === "off") throw new Error("Demo login disabled");
  const userId = String(formData.get("userId") ?? "");
  const user = await db.user.findFirst({ where: { id: userId, status: "ACTIVE", deletedAt: null } });
  if (!user) redirect("/login");
  (await cookies()).set(SESSION_COOKIE, user.id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 12 });
  await db.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });
  redirect("/");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

export async function setLocale(formData: FormData) {
  const l = String(formData.get("locale"));
  if ((LOCALES as readonly string[]).includes(l)) (await cookies()).set("locale", l, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  const back = String(formData.get("back") ?? "/");
  redirect(back.startsWith("/") ? back : "/");
}
