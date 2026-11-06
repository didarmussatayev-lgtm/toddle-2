/**
 * Первичная настройка рабочей школы (один раз на чистой базе после миграций):
 *   npx tsx scripts/setup-school.ts --name "Лицей №1" --code LYC1 --admin-email admin@school.kz --admin-first Имя --admin-last Фамилия [--app-url https://journal.school.kz]
 * Создаёт школу с политикой оценивания и периодами, первого администратора и печатает одноразовую ссылку для установки его пароля.
 */
import { PrismaClient } from "@prisma/client";
import { createSchoolBase } from "../prisma/base";
import { createSubjectCatalog } from "../prisma/catalog";
import { randomToken, sha256 } from "../src/lib/security/tokens";

const db = new PrismaClient();
const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};

async function main() {
  const name = arg("name");
  const code = arg("code");
  const email = arg("admin-email")?.toLowerCase();
  const first = arg("admin-first");
  const last = arg("admin-last");
  const appUrl = (arg("app-url") ?? process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  if (!name || !code || !email || !first || !last) {
    console.error("Нужно: --name --code --admin-email --admin-first --admin-last");
    process.exit(1);
  }
  if (await db.school.count()) {
    console.error("В базе уже есть школа. Скрипт предназначен для чистой базы.");
    process.exit(1);
  }
  const { school, myp, dp } = await createSchoolBase(db, { name: { ru: name, kk: name, en: name }, code: code.toUpperCase() });
  await createSubjectCatalog(db, school.id, myp.id, dp.id);
  const admin = await db.user.create({
    data: { schoolId: school.id, email, firstName: first, lastName: last, status: "INVITED", uid: "SCH-000001", roles: { create: { role: "SCHOOL_ADMIN" } }, staffProfile: { create: { displayTitle: "Администратор системы" } } },
  });
  const token = randomToken();
  await db.loginToken.create({ data: { userId: admin.id, tokenHash: sha256(token), purpose: "INVITE", expiresAt: new Date(Date.now() + 72 * 3600_000) } });
  await db.auditLog.create({ data: { schoolId: school.id, action: "SCHOOL_SETUP", entityType: "School", entityId: school.id, meta: { admin: email } } });
  console.log(`Школа «${name}» создана. Администратор: ${email}`);
  console.log(`Ссылка для установки пароля (действует 72 часа, одноразовая):\n${appUrl}/invite/${token}`);
}
main().finally(() => db.$disconnect());
