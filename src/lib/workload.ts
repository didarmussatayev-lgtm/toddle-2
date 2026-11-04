import { db } from "./db";
import { isoToDate } from "./dates";

/** Сколько суммативных уже стоит у учеников курса на дату (правило «не более 3 в день»). */
export async function summativeLoad(courseId: string, dateIso: string) {
  const enr = await db.courseEnrollment.findMany({ where: { courseId, status: "ACTIVE" }, select: { studentId: true } });
  const studentIds = enr.map((e) => e.studentId);
  const start = isoToDate(dateIso);
  const end = new Date(start.getTime() + 86400000);
  const list = await db.assignment.findMany({
    where: { type: "SUMMATIVE", deletedAt: null, dueAt: { gte: start, lt: end }, course: { enrollments: { some: { studentId: { in: studentIds } } } } },
    select: { id: true, course: { select: { enrollments: { select: { studentId: true } } } } },
  });
  const perStudent = new Map<string, number>();
  for (const a of list) for (const e of a.course.enrollments) if (studentIds.includes(e.studentId)) perStudent.set(e.studentId, (perStudent.get(e.studentId) ?? 0) + 1);
  return Math.max(0, ...perStudent.values());
}
