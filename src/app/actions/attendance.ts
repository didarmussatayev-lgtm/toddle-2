"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canManageCourse } from "@/lib/access";
import { isIso, isoToDate } from "@/lib/dates";

export async function saveAttendance(formData: FormData) {
  const user = await requireUser();
  const entryId = String(formData.get("entryId"));
  const date = String(formData.get("date"));
  if (!isIso(date)) throw new Error("bad date");
  const entry = await db.timetableEntry.findUniqueOrThrow({ where: { id: entryId }, include: { course: { include: { enrollments: { where: { status: "ACTIVE" } } } } } });
  if (!(await canManageCourse(user, entry.courseId))) throw new Error("forbidden");

  const allPresent = formData.get("allPresent") != null;
  const codes = await db.attendanceCode.findMany({ where: { active: true } });
  const present = codes.find((c) => c.kind === "PRESENT")!;
  const session = await db.attendanceSession.upsert({
    where: { entryId_date: { entryId, date: isoToDate(date) } },
    create: { entryId, date: isoToDate(date), markedById: user.id, markedAt: new Date() },
    update: { markedById: user.id, markedAt: new Date() },
  });
  const absentCodeIds = new Set(codes.filter((c) => c.kind === "ABSENT").map((c) => c.id));
  const newlyAbsent: string[] = [];
  for (const e of entry.course.enrollments) {
    const raw = String(formData.get(`code_${e.studentId}`) ?? present.id);
    const codeId = allPresent ? present.id : codes.some((c) => c.id === raw) ? raw : present.id;
    const note = allPresent ? null : (String(formData.get(`note_${e.studentId}`) ?? "").trim() || null);
    const prev = await db.attendanceRecord.findUnique({ where: { sessionId_studentId: { sessionId: session.id, studentId: e.studentId } } });
    await db.attendanceRecord.upsert({
      where: { sessionId_studentId: { sessionId: session.id, studentId: e.studentId } },
      create: { sessionId: session.id, studentId: e.studentId, codeId, note },
      update: { codeId, note },
    });
    if (absentCodeIds.has(codeId) && prev?.codeId !== codeId) newlyAbsent.push(e.studentId);
  }
  // уведомление родителям об отсутствии
  if (newlyAbsent.length) {
    const links = await db.studentGuardian.findMany({ where: { studentId: { in: newlyAbsent }, approved: true }, include: { guardian: true, student: { include: { user: true } } } });
    await db.notification.createMany({
      data: links.map((l) => ({
        recipientId: l.guardian.userId, trigger: "ATTENDANCE_ABSENT",
        title: `Отсутствие: ${l.student.user.firstName}, ${entry.course.name}, ${date}`, entityType: "AttendanceSession", entityId: session.id,
      })),
    });
  }
  revalidatePath("/today");
  redirect(`/attendance/${entryId}/${date}?saved=1`);
}
