import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAdmin, isSchoolAdmin } from "@/lib/access";

/** CSV с итоговыми 5-балльными оценками для загрузки в EduPage (R1: файловый экспорт). */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !canAdmin(user)) return new NextResponse("Forbidden", { status: 403 });
  const abbr = (req.nextUrl.searchParams.get("period") ?? "FY").replace(/[^A-Z0-9]/g, "").slice(0, 4) || "FY";
  // Координатор/завуч с областью программы выгружают только свою программу
  const scoped = user.roles.filter((r) => (r.role === "COORDINATOR" || r.role === "DEPUTY_HEAD") && r.programmeId).map((r) => r.programmeId!);
  const allProgrammes = isSchoolAdmin(user) || user.roles.some((r) => r.role === "DEPUTY_HEAD" && !r.programmeId);
  const rows = await db.periodGrade.findMany({
    where: {
      period: { abbreviation: abbr, academicYear: { isCurrent: true, schoolId: user.schoolId } },
      ...(allProgrammes ? {} : { course: { programmeId: { in: scoped } } }),
    },
    include: { student: { include: { user: true, groupMembers: { include: { group: true } } } }, course: { include: { subject: true } }, period: true },
    orderBy: [{ course: { name: "asc" } }, { student: { user: { lastName: "asc" } } }],
  });
  // Экранирование CSV и защита от формул в Excel (значения, начинающиеся с = + - @)
  const esc = (v: unknown) => {
    let s = String(v ?? "");
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return `"${s.replace(/"/g, '""')}"`;
  };
  const header = ["student_id", "last_name", "first_name", "class", "subject", "course", "period", "grade_1_7", "grade_5", "overridden", "published"];
  const lines = rows.map((r) => [
    r.student.studentUid, r.student.user.lastName, r.student.user.firstName, r.student.groupMembers[0]?.group.name,
    (r.course.subject.name as Record<string, string>).ru, r.course.name, r.period.abbreviation,
    r.gradeOverride7 ?? r.grade7, r.gradeOverride5 ?? r.grade5, r.gradeOverride7 != null ? 1 : 0, r.published ? 1 : 0,
  ].map(esc).join(","));
  const school = await db.school.findFirst({ where: { id: user.schoolId } });
  if (school) await db.auditLog.create({ data: { schoolId: school.id, actorId: user.id, action: "EXPORT_GRADES", entityType: "GradingPeriod", meta: { period: abbr, rows: rows.length } } });
  const csv = "﻿" + [header.join(","), ...lines].join("\r\n");
  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="edupage_grades_${abbr}.csv"`, "Cache-Control": "no-store" },
  });
}
