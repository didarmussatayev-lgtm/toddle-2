"use server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function markAllRead() {
  const user = await requireUser();
  await db.notification.updateMany({ where: { recipientId: user.id, readAt: null }, data: { readAt: new Date() } });
  redirect("/notifications");
}
