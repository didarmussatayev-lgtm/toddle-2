/**
 * Массовая выдача одноразовых ссылок для установки пароля (для рассылки родителям и др.).
 *   npx tsx scripts/invite-links.ts --role parent|student|teacher|all --out links.csv [--hours 168]
 * Только для пользователей без пароля и без привязанного Google. Прежние неиспользованные ссылки аннулируются.
 * ВНИМАНИЕ: файл содержит действующие ссылки входа — передавайте адресатам лично и удалите файл после рассылки.
 */
import { PrismaClient, type RoleKey } from "@prisma/client";
import { writeFileSync } from "node:fs";
import { randomToken, sha256 } from "../src/lib/security/tokens";

const db = new PrismaClient();
const arg = (n: string) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : undefined; };
const ROLES: Record<string, RoleKey[]> = { parent: ["GUARDIAN"], student: ["STUDENT"], teacher: ["TEACHER", "COORDINATOR", "DEPUTY_HEAD", "SCHOOL_ADMIN"], all: [] };

async function main() {
  const role = arg("role") ?? "";
  const out = arg("out");
  const hours = Number(arg("hours") ?? 168);
  const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  if (!(role in ROLES) || !out || !(hours > 0 && hours <= 24 * 30)) {
    console.error("Использование: --role parent|student|teacher|all --out links.csv [--hours 168]");
    process.exit(1);
  }
  const users = await db.user.findMany({
    where: {
      deletedAt: null, status: { not: "DISABLED" }, passwordHash: null, authAccounts: { none: {} },
      ...(ROLES[role].length ? { roles: { some: { role: { in: ROLES[role] } } } } : {}),
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  const expiresAt = new Date(Date.now() + hours * 3600_000);
  const lines = ["email;last_name;first_name;link;expires"];
  for (const u of users) {
    const token = randomToken();
    await db.$transaction([
      db.loginToken.updateMany({ where: { userId: u.id, usedAt: null }, data: { usedAt: new Date() } }),
      db.loginToken.create({ data: { userId: u.id, tokenHash: sha256(token), purpose: "INVITE", expiresAt } }),
    ]);
    lines.push([u.email, u.lastName, u.firstName, `${appUrl}/invite/${token}`, expiresAt.toISOString()].join(";"));
  }
  writeFileSync(out, "﻿" + lines.join("\r\n"), { mode: 0o600 });
  const school = await db.school.findFirst();
  if (school) await db.auditLog.create({ data: { schoolId: school.id, action: "INVITE_LINKS_BULK", entityType: "School", entityId: school.id, meta: { role, count: users.length, hours } } });
  console.log(`Ссылок: ${users.length} → ${out} (действуют ${hours} ч). Удалите файл после рассылки.`);
}
main().finally(() => db.$disconnect());
