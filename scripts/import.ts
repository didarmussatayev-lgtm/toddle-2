/**
 * Импорт рабочей школы из CSV (выгрузка из Excel/Google Sheets, разделитель «;» или «,», UTF-8).
 *
 *   npx tsx scripts/import.ts people  deploy/templates/people.csv  [--dry-run]
 *   npx tsx scripts/import.ts courses deploy/templates/courses.csv [--dry-run]
 *
 * Порядок: сначала people (сотрудники, ученики, родители, классы), затем courses.
 * Повторный запуск безопасен: существующие email и курсы не дублируются (только добавляются недостающие роли и связи).
 * Весь файл импортируется в одной транзакции: при ошибке ничего не сохраняется.
 */
import { PrismaClient, type Prisma, type RoleKey } from "@prisma/client";
import { readFileSync } from "node:fs";

const db = new PrismaClient();
type Tx = Prisma.TransactionClient;

// ---------- CSV ----------
export function parseCsv(text: string): Record<string, string>[] {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.split(/\r?\n/, 1)[0];
  const delim = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delim) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  const [header, ...data] = rows.filter((r) => r.some((c) => c.trim() !== ""));
  if (!header) return [];
  const keys = header.map((h) => h.trim().toLowerCase());
  return data.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? "").trim()])));
}

// ---------- общие помощники ----------
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ROLE_MAP: Record<string, { role: RoleKey; programme?: "MYP" | "DP"; staff: boolean }[]> = {
  admin: [{ role: "SCHOOL_ADMIN", staff: true }],
  deputy: [{ role: "DEPUTY_HEAD", staff: true }],
  coordinator_myp: [{ role: "COORDINATOR", programme: "MYP", staff: true }, { role: "TEACHER", staff: true }],
  coordinator_dp: [{ role: "COORDINATOR", programme: "DP", staff: true }, { role: "TEACHER", staff: true }],
  teacher: [{ role: "TEACHER", staff: true }],
  advisor: [{ role: "TEACHER", staff: true }, { role: "HOMEROOM_ADVISOR", staff: true }],
  student: [{ role: "STUDENT", staff: false }],
  parent: [{ role: "GUARDIAN", staff: false }],
};

/** «7A» → MYP, 7 класс; «DP1»/«DP 2» → DP, 11/12 класс. */
export function parseClass(name: string): { programme: "MYP" | "DP"; grade: number; label: string } | null {
  const n = name.replace(/\s+/g, "").toUpperCase();
  const dp = n.match(/^DP([12])/);
  if (dp) return { programme: "DP", grade: 10 + Number(dp[1]), label: `DP ${dp[1]}` };
  const m = n.match(/^(\d{1,2})/);
  if (!m) return null;
  const grade = Number(m[1]);
  if (grade < 1 || grade > 12) return null;
  return { programme: grade >= 11 ? "DP" : "MYP", grade, label: `Grade ${grade}` };
}

async function context(tx: Tx) {
  const school = await tx.school.findFirst();
  if (!school) throw new Error("Сначала выполните scripts/setup-school.ts");
  const year = await tx.academicYear.findFirst({ where: { schoolId: school.id, isCurrent: true } });
  if (!year) throw new Error("Нет текущего учебного года");
  const programmes = Object.fromEntries((await tx.programme.findMany({ where: { schoolId: school.id } })).map((p) => [p.code, p]));
  return { school, year, programmes };
}

type Ctx = Awaited<ReturnType<typeof context>>;

async function homeroom(tx: Tx, ctx: Ctx, className: string) {
  const parsed = parseClass(className);
  if (!parsed) throw new Error(`Не понимаю класс «${className}» (ожидается 7A, 10B, DP1…)`);
  const programme = ctx.programmes[parsed.programme];
  const graduationYear = ctx.year.endDate.getUTCFullYear() + (12 - parsed.grade);
  const yg = await tx.yearGroup.upsert({
    where: { programmeId_graduationYear: { programmeId: programme.id, graduationYear } },
    create: { programmeId: programme.id, graduationYear, batchLabel: `Batch of ${graduationYear}` },
    update: {},
  });
  await tx.yearGroupYear.upsert({
    where: { yearGroupId_academicYearId: { yearGroupId: yg.id, academicYearId: ctx.year.id } },
    create: { yearGroupId: yg.id, academicYearId: ctx.year.id, gradeLabel: parsed.label, gradeNumber: parsed.grade },
    update: {},
  });
  const name = className.replace(/\s+/g, "").toUpperCase();
  return (
    (await tx.studentGroup.findFirst({ where: { academicYearId: ctx.year.id, kind: "HOMEROOM", name } })) ??
    (await tx.studentGroup.create({ data: { academicYearId: ctx.year.id, yearGroupId: yg.id, kind: "HOMEROOM", name } }))
  );
}

let uidSeq = 0;
async function nextUid(tx: Tx, schoolId: string) {
  if (!uidSeq) uidSeq = (await tx.user.count({ where: { schoolId } })) + 1;
  for (;;) {
    const uid = `SCH-${String(uidSeq++).padStart(6, "0")}`;
    if (!(await tx.user.findFirst({ where: { schoolId, uid } }))) return uid;
  }
}

// ---------- люди ----------
async function importPeople(tx: Tx, rows: Record<string, string>[], log: string[]) {
  const ctx = await context(tx);
  const stats = { created: 0, updated: 0, links: 0 };
  // родители — после учеников, чтобы найти детей
  const ordered = [...rows.filter((r) => r.role?.toLowerCase() !== "parent"), ...rows.filter((r) => r.role?.toLowerCase() === "parent")];
  const advisorClasses: { staffId: string; groupId: string }[] = [];

  for (const [i, r] of ordered.entries()) {
    const line = `строка «${r.email || r.last_name || i + 2}»`;
    const roleKey = (r.role ?? "").toLowerCase();
    const roles = ROLE_MAP[roleKey];
    const email = (r.email ?? "").toLowerCase();
    if (!roles) throw new Error(`${line}: неизвестная роль «${r.role}» (допустимо: ${Object.keys(ROLE_MAP).join(", ")})`);
    if (!EMAIL.test(email)) throw new Error(`${line}: неверный email`);
    if (!r.last_name || !r.first_name) throw new Error(`${line}: нужны last_name и first_name`);

    let user = await tx.user.findFirst({ where: { schoolId: ctx.school.id, email: { equals: email, mode: "insensitive" } }, include: { roles: true } });
    if (!user) {
      user = await tx.user.create({
        data: { schoolId: ctx.school.id, email, firstName: r.first_name, lastName: r.last_name, middleName: r.middle_name || null, status: "INVITED", uid: await nextUid(tx, ctx.school.id) },
        include: { roles: true },
      });
      stats.created++;
    } else stats.updated++;

    for (const def of roles) {
      const programmeId = def.programme ? ctx.programmes[def.programme].id : null;
      if (!user.roles.some((x) => x.role === def.role && x.programmeId === programmeId)) {
        await tx.roleAssignment.create({ data: { userId: user.id, role: def.role, programmeId } });
      }
    }
    if (roles[0].staff) {
      const sp = await tx.staffProfile.upsert({ where: { userId: user.id }, create: { userId: user.id, displayTitle: r.title || null }, update: r.title ? { displayTitle: r.title } : {} });
      if (r.class) advisorClasses.push({ staffId: sp.id, groupId: (await homeroom(tx, ctx, r.class)).id });
    } else if (roleKey === "student") {
      if (!r.class) throw new Error(`${line}: для ученика нужен class`);
      const sp = await tx.studentProfile.upsert({ where: { userId: user.id }, create: { userId: user.id, studentUid: r.student_id || null }, update: r.student_id ? { studentUid: r.student_id } : {} });
      const group = await homeroom(tx, ctx, r.class);
      await tx.groupMember.upsert({ where: { groupId_studentId: { groupId: group.id, studentId: sp.id } }, create: { groupId: group.id, studentId: sp.id }, update: {} });
      // зачислить в уже созданные курсы класса
      const courses = await tx.courseGroup.findMany({ where: { groupId: group.id } });
      for (const cg of courses) {
        await tx.courseEnrollment.upsert({ where: { courseId_studentId: { courseId: cg.courseId, studentId: sp.id } }, create: { courseId: cg.courseId, studentId: sp.id }, update: {} });
      }
    } else if (roleKey === "parent") {
      const gp = await tx.guardianProfile.upsert({ where: { userId: user.id }, create: { userId: user.id, phone: r.phone || null }, update: r.phone ? { phone: r.phone } : {} });
      const children = (r.child_email ?? "").split(/[|,\s]+/).map((e) => e.toLowerCase()).filter(Boolean);
      if (!children.length) throw new Error(`${line}: для родителя нужен child_email`);
      for (const ce of children) {
        const child = await tx.studentProfile.findFirst({ where: { user: { schoolId: ctx.school.id, email: { equals: ce, mode: "insensitive" } } } });
        if (!child) throw new Error(`${line}: ученик ${ce} не найден (добавьте его строкой с role=student)`);
        await tx.studentGuardian.upsert({
          where: { studentId_guardianId: { studentId: child.id, guardianId: gp.id } },
          create: { studentId: child.id, guardianId: gp.id, relation: r.relation || null, approved: true, connectedAt: new Date() },
          update: {},
        });
        stats.links++;
      }
    }
  }
  // кураторы классов
  for (const a of advisorClasses) {
    const members = await tx.groupMember.findMany({ where: { groupId: a.groupId } });
    for (const m of members) {
      await tx.studentAdvisor.upsert({
        where: { academicYearId_studentId_staffId: { academicYearId: ctx.year.id, studentId: m.studentId, staffId: a.staffId } },
        create: { academicYearId: ctx.year.id, studentId: m.studentId, staffId: a.staffId },
        update: {},
      });
    }
  }
  log.push(`Люди: создано ${stats.created}, уже были ${stats.updated}, связей родитель–ребёнок ${stats.links}`);
}

// ---------- курсы ----------
async function importCourses(tx: Tx, rows: Record<string, string>[], log: string[]) {
  const ctx = await context(tx);
  let created = 0;
  let skipped = 0;
  const subjects = await tx.subject.findMany({ where: { programme: { schoolId: ctx.school.id } } });
  for (const [i, r] of rows.entries()) {
    const line = `строка ${i + 2}`;
    const cls = parseClass(r.class ?? "");
    if (!cls) throw new Error(`${line}: неверный class «${r.class}»`);
    const programme = ctx.programmes[cls.programme];
    const want = (r.subject ?? "").toLowerCase();
    const subject = subjects.find((s) => s.programmeId === programme.id && Object.values(s.name as Record<string, string>).some((n) => n?.toLowerCase() === want));
    if (!subject) {
      const names = subjects.filter((s) => s.programmeId === programme.id).map((s) => (s.name as Record<string, string>).ru);
      throw new Error(`${line}: предмет «${r.subject}» не найден в ${cls.programme}. Есть: ${names.join(", ")}`);
    }
    const level = (r.level ?? "").toUpperCase();
    if (level && level !== "SL" && level !== "HL") throw new Error(`${line}: level должен быть SL, HL или пусто`);
    const teacherEmails = (r.teacher_email ?? "").split(/[|,\s]+/).map((e) => e.toLowerCase()).filter(Boolean);
    const teachers = [];
    for (const te of teacherEmails) {
      const sp = await tx.staffProfile.findFirst({ where: { user: { schoolId: ctx.school.id, email: { equals: te, mode: "insensitive" } } } });
      if (!sp) throw new Error(`${line}: учитель ${te} не найден (импортируйте people.csv раньше)`);
      teachers.push(sp);
    }
    const group = await homeroom(tx, ctx, r.class);
    const subjectName = (subject.name as Record<string, string>).en ?? (subject.name as Record<string, string>).ru;
    const name = `${group.name} ${subjectName}${level ? " " + level : ""}`;
    const existing = await tx.course.findFirst({ where: { academicYearId: ctx.year.id, name, deletedAt: null } });
    if (existing) { skipped++; continue; }
    const members = await tx.groupMember.findMany({ where: { groupId: group.id } });
    await tx.course.create({
      data: {
        schoolId: ctx.school.id, academicYearId: ctx.year.id, programmeId: programme.id, subjectId: subject.id, name, level: (level || "NONE") as "NONE" | "SL" | "HL",
        groups: { create: { groupId: group.id } },
        staff: { create: teachers.map((t, k) => ({ staffId: t.id, isPrimary: k === 0 })) },
        enrollments: { create: members.map((m) => ({ studentId: m.studentId })) },
      },
    });
    created++;
  }
  log.push(`Курсы: создано ${created}, уже были ${skipped}`);
}

async function main() {
  const [kind, file] = process.argv.slice(2);
  const dryRun = process.argv.includes("--dry-run");
  if (!["people", "courses"].includes(kind) || !file) {
    console.error("Использование: npx tsx scripts/import.ts people|courses <file.csv> [--dry-run]");
    process.exit(1);
  }
  const rows = parseCsv(readFileSync(file, "utf8"));
  console.log(`Строк: ${rows.length}${dryRun ? " (проверка без сохранения)" : ""}`);
  const log: string[] = [];
  try {
    await db.$transaction(async (tx) => {
      if (kind === "people") await importPeople(tx, rows, log);
      else await importCourses(tx, rows, log);
      if (dryRun) throw new DryRun();
    }, { timeout: 300_000, maxWait: 10_000 });
  } catch (e) {
    if (!(e instanceof DryRun)) {
      console.error("ОШИБКА, ничего не сохранено:", (e as Error).message);
      process.exit(1);
    }
  }
  log.forEach((l) => console.log(l));
  if (!dryRun) {
    const school = await db.school.findFirst();
    if (school) await db.auditLog.create({ data: { schoolId: school.id, action: "IMPORT_" + kind.toUpperCase(), entityType: "School", entityId: school.id, meta: { rows: rows.length, file: file.split("/").pop() } } });
  }
  console.log(dryRun ? "Проверка пройдена, данные не сохранены." : "Готово.");
}

class DryRun extends Error {}

if (process.argv[1]?.endsWith("import.ts")) main().finally(() => db.$disconnect());
