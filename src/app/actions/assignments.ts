"use server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canEditGrades, canManageCourse } from "@/lib/access";
import { isIso } from "@/lib/dates";
import { clip, isUuid } from "@/lib/validate";

export async function createAssignment(formData: FormData) {
  const user = await requireUser();
  const courseId = String(formData.get("courseId"));
  if (!isUuid(courseId) || !(await canManageCourse(user, courseId))) throw new Error("forbidden");
  const course = await db.course.findUniqueOrThrow({ where: { id: courseId }, include: { groups: true, subject: { include: { criteria: true } } } });
  const title = clip(formData.get("title"), 200);
  const type = String(formData.get("type")) === "FORMATIVE" ? "FORMATIVE" : "SUMMATIVE";
  const due = String(formData.get("due") ?? "");
  const periodId = String(formData.get("periodId") ?? "");
  if (!title || !isIso(due)) throw new Error("Заполните название и дату");
  const period = await db.gradingPeriod.findFirst({ where: { id: periodId, programmeId: course.programmeId, kind: "REPORTING" } });
  if (!period) throw new Error("Неверный период");
  if (!(await canEditGrades(user, courseId, period.id))) throw new Error("Период заблокирован");
  const critIds = formData.getAll("criteria").map(String).filter((id) => course.subject.criteria.some((c) => c.id === id));
  const maxRaw = String(formData.get("maxScore") ?? "").trim();
  const maxScore = maxRaw ? Number(maxRaw) : null;
  if (maxScore != null && (!Number.isFinite(maxScore) || maxScore <= 0)) throw new Error("Неверный макс. балл");
  const category = await db.gradingCategory.findFirst({ where: { schoolId: course.schoolId, code: type } });
  const isMyp = (await db.programme.findUniqueOrThrow({ where: { id: course.programmeId } })).code === "MYP";
  const a = await db.assignment.create({
    data: {
      courseId, title, type, periodId: period.id, categoryId: category?.id, status: "PUBLISHED", publishAt: new Date(),
      dueAt: new Date(`${due}T13:00:00.000Z`), maxScore, createdById: user.id, isSummativeDate: type === "SUMMATIVE",
      hideTotalFromStudents: isMyp && type === "SUMMATIVE",
      instructions: { ru: clip(formData.get("instructions"), 5000) },
      criteria: { create: critIds.map((criterionId) => ({ criterionId, maxLevel: 8 })) },
      targets: { create: course.groups.map((g) => ({ groupId: g.groupId })) },
    },
  });
  redirect(`/assignments/${a.id}?created=1`);
}

