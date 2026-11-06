"use server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser, fullName } from "@/lib/auth";
import { canEditGrades, canManageCourse, isCoordinatorOf, isSchoolAdmin } from "@/lib/access";
import { recalcCourse, fiveFor } from "@/lib/grading/service";
import type { SubmissionStatus } from "@prisma/client";
import { clip, isUuid } from "@/lib/validate";

const SUB_STATUSES: SubmissionStatus[] = ["NOT_SUBMITTED", "SUBMITTED", "LATE", "RETURNED", "MISSED_VALID", "MISSED_INVALID"];

export async function saveEvaluations(formData: FormData) {
  const user = await requireUser();
  const assignmentId = String(formData.get("assignmentId"));
  if (!isUuid(assignmentId)) throw new Error("bad id");
  const publish = formData.get("publish") != null;
  const a = await db.assignment.findUniqueOrThrow({
    where: { id: assignmentId },
    include: { criteria: true, course: { include: { enrollments: { where: { status: "ACTIVE" } } } } },
  });
  if (!(await canEditGrades(user, a.courseId, a.periodId))) throw new Error("forbidden: period locked or not your course");

  const notifyStudents: string[] = [];
  for (const e of a.course.enrollments) {
    const sid = e.studentId;
    const subRaw = String(formData.get(`sub_${sid}`) ?? "");
    const subStatus = SUB_STATUSES.includes(subRaw as SubmissionStatus) ? (subRaw as SubmissionStatus) : null;
    if (subStatus) {
      await db.submission.upsert({
        where: { assignmentId_studentId: { assignmentId, studentId: sid } },
        create: { assignmentId, studentId: sid, status: subStatus, submittedAt: subStatus === "SUBMITTED" || subStatus === "LATE" ? new Date() : null, makeupUntil: subStatus === "MISSED_VALID" ? new Date(Date.now() + 7 * 86400000) : null },
        update: { status: subStatus, makeupUntil: subStatus === "MISSED_VALID" ? new Date(Date.now() + 7 * 86400000) : null },
      });
    }
    const levels = a.criteria.map((c) => {
      const raw = String(formData.get(`lvl_${sid}_${c.criterionId}`) ?? "").trim();
      if (raw === "") return { criterionId: c.criterionId, level: null as number | null };
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 0 || n > c.maxLevel) throw new Error(`Уровень должен быть 0–${c.maxLevel}`);
      return { criterionId: c.criterionId, level: n };
    });
    const scoreRaw = String(formData.get(`score_${sid}`) ?? "").trim();
    let score: number | null = null;
    if (scoreRaw !== "" && a.maxScore) {
      score = Number(scoreRaw.replace(",", "."));
      if (!Number.isFinite(score) || score < 0 || score > Number(a.maxScore)) throw new Error(`Балл должен быть 0–${a.maxScore}`);
    }
    const comment = clip(formData.get(`comment_${sid}`), 2000);
    const hasData = levels.some((l) => l.level != null) || score != null;
    const existing = await db.evaluation.findUnique({ where: { assignmentId_studentId: { assignmentId, studentId: sid } } });
    if (!hasData && !existing && !comment) continue;
    const status = !hasData ? (existing?.status ?? "NOT_EVALUATED") : publish ? "SHARED" : existing?.status === "SHARED" ? "SHARED" : "EVALUATED";
    const ev = await db.evaluation.upsert({
      where: { assignmentId_studentId: { assignmentId, studentId: sid } },
      create: { assignmentId, studentId: sid, status, score, comment: comment ? { text: comment } : undefined, evaluatedById: user.id, evaluatedAt: new Date(), sharedAt: status === "SHARED" ? new Date() : null },
      update: { status, score, comment: comment ? { text: comment } : undefined, evaluatedById: user.id, evaluatedAt: new Date(), sharedAt: status === "SHARED" && existing?.status !== "SHARED" ? new Date() : existing?.sharedAt },
    });
    for (const l of levels) {
      if (l.level == null) {
        await db.criterionEvaluation.deleteMany({ where: { evaluationId: ev.id, criterionId: l.criterionId } });
      } else {
        await db.criterionEvaluation.upsert({
          where: { evaluationId_criterionId: { evaluationId: ev.id, criterionId: l.criterionId } },
          create: { evaluationId: ev.id, criterionId: l.criterionId, level: l.level },
          update: { level: l.level },
        });
      }
    }
    if (status === "SHARED" && existing?.status !== "SHARED") notifyStudents.push(sid);
  }
  if (notifyStudents.length) await notifyFamilies(notifyStudents, "GRADE_PUBLISHED", `Опубликована оценка: ${a.title}`, "Assignment", a.id);
  await recalcCourse(db, a.courseId);
  redirect(`/assignments/${assignmentId}?saved=1`);
}

async function notifyFamilies(studentIds: string[], trigger: string, title: string, entityType: string, entityId: string) {
  const students = await db.studentProfile.findMany({ where: { id: { in: studentIds } }, include: { guardians: { where: { approved: true }, include: { guardian: true } } } });
  const data = students.flatMap((s) => [
    { recipientId: s.userId, trigger, title, entityType, entityId },
    ...s.guardians.map((g) => ({ recipientId: g.guardian.userId, trigger, title, entityType, entityId })),
  ]);
  if (data.length) await db.notification.createMany({ data });
}

export async function recalcAction(formData: FormData) {
  const user = await requireUser();
  const courseId = String(formData.get("courseId"));
  if (!isUuid(courseId) || !(await canManageCourse(user, courseId))) throw new Error("forbidden");
  await recalcCourse(db, courseId);
  const period = String(formData.get("period") ?? "").replace(/[^A-Z0-9]/g, "").slice(0, 4);
  redirect(`/courses/${courseId}?period=${period}&recalc=1`);
}

export async function publishPeriod(formData: FormData) {
  const user = await requireUser();
  const courseId = String(formData.get("courseId"));
  const periodId = String(formData.get("periodId"));
  if (!isUuid(courseId) || !isUuid(periodId)) throw new Error("bad id");
  const publish = String(formData.get("publish")) === "1";
  if (!(await canEditGrades(user, courseId, periodId))) throw new Error("forbidden");
  const course = await db.course.findUniqueOrThrow({ where: { id: courseId } });
  const period = await db.gradingPeriod.findUniqueOrThrow({ where: { id: periodId } });
  await db.periodGrade.updateMany({ where: { courseId, periodId }, data: { published: publish } });
  if (publish) {
    const pgs = await db.periodGrade.findMany({ where: { courseId, periodId }, select: { studentId: true } });
    await notifyFamilies(pgs.map((p) => p.studentId), "PERIOD_PUBLISHED", `Итоги ${period.name}: ${course.name}`, "Course", courseId);
  }
  await db.auditLog.create({ data: { schoolId: course.schoolId, actorId: user.id, action: publish ? "PERIOD_PUBLISH" : "PERIOD_UNPUBLISH", entityType: "Course", entityId: courseId, meta: { period: period.abbreviation, course: course.name } } });
  redirect(`/courses/${courseId}?period=${period.abbreviation}`);
}

export async function overrideGrade(formData: FormData) {
  const user = await requireUser();
  const pgId = String(formData.get("periodGradeId"));
  if (!isUuid(pgId)) throw new Error("bad id");
  const clear = formData.get("clear") != null;
  const pg = await db.periodGrade.findUniqueOrThrow({ where: { id: pgId }, include: { course: true, period: true, student: { include: { user: true } } } });
  if (!(await canEditGrades(user, pg.courseId, pg.periodId))) throw new Error("forbidden");
  const reason = clip(formData.get("reason"), 500);
  let g7: number | null = null;
  if (!clear) {
    g7 = Number(formData.get("grade7"));
    if (!Number.isInteger(g7) || g7 < 1 || g7 > 7) throw new Error("Оценка 1–7");
    if (!reason) throw new Error("Укажите причину");
  }
  const g5 = g7 == null ? null : await fiveFor(db, pg.course.programmeId, g7);
  await db.periodGrade.update({
    where: { id: pgId },
    data: { gradeOverride7: g7, gradeOverride5: g5, overriddenById: clear ? null : user.id, overriddenAt: clear ? null : new Date() },
  });
  await db.auditLog.create({
    data: {
      schoolId: pg.course.schoolId, actorId: user.id, action: clear ? "GRADE_OVERRIDE_CLEAR" : "GRADE_OVERRIDE", entityType: "PeriodGrade", entityId: pgId,
      meta: { from: pg.gradeOverride7 ?? pg.grade7, to: g7 ?? pg.grade7, reason: reason || null, student: fullName(pg.student.user), course: pg.course.name, period: pg.period.abbreviation },
    },
  });
  await recalcCourse(db, pg.courseId, [pg.studentId]);
  redirect(`/courses/${pg.courseId}?period=${pg.period.abbreviation}`);
}

export async function toggleLock(formData: FormData) {
  const user = await requireUser();
  const periodId = String(formData.get("periodId"));
  if (!isUuid(periodId)) throw new Error("bad id");
  const p = await db.gradingPeriod.findUniqueOrThrow({ where: { id: periodId }, include: { programme: true } });
  if (!(isSchoolAdmin(user) || isCoordinatorOf(user, p.programmeId))) throw new Error("forbidden");
  await db.gradingPeriod.update({ where: { id: periodId }, data: { locked: !p.locked } });
  await db.auditLog.create({ data: { schoolId: p.programme.schoolId, actorId: user.id, action: p.locked ? "PERIOD_UNLOCK" : "PERIOD_LOCK", entityType: "GradingPeriod", entityId: periodId, meta: { period: p.abbreviation, programme: p.programme.code } } });
  redirect("/admin");
}
