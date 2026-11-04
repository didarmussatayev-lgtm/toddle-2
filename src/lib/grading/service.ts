import type { PrismaClient, Prisma } from "@prisma/client";
import {
  computeTermGrade, combinePeriodGrades, toDependentScale, type Aggregation, type BoundarySets,
  type PercentBand, type DependentEntry,
} from "./engine";

type Tx = PrismaClient | Prisma.TransactionClient;

/** Загружает политику оценивания программы (все «магические числа» — из БД). */
export async function loadPolicy(db: Tx, programmeId: string, academicYearId: string) {
  const policy = await db.gradingPolicy.findFirst({
    where: { programmeId, OR: [{ academicYearId }, { academicYearId: null }] },
    orderBy: { academicYearId: { sort: "asc", nulls: "last" } },
    include: { boundarySets: { include: { boundaries: true } }, percentToGrade: true },
  });
  if (!policy) throw new Error("Не настроена политика оценивания для программы");
  const boundarySets: BoundarySets = {};
  for (const s of policy.boundarySets) {
    boundarySets[s.criteriaCount] = s.boundaries.map((b) => ({ grade: b.grade, minTotal: b.minTotal, maxTotal: b.maxTotal }));
  }
  const percentBands: PercentBand[] = policy.percentToGrade.map((b) => ({
    grade: b.grade, minPct: Number(b.minPct), maxPct: Number(b.maxPct),
  }));
  const five = await db.gradeScale.findFirst({
    where: { programmeId, type: "DEPENDENT" },
    include: { entries: true },
  });
  const fiveScale: DependentEntry[] = (five?.entries ?? []).map((e) => ({
    label: e.label, value: Number(e.numericValue ?? e.label), sourceValues: e.sourceValues,
  }));
  return { policy, boundarySets, percentBands, fiveScale };
}

/** Пересчитать итоги курса за все периоды (reporting → cumulative). Override и публикация сохраняются. */
export async function recalcCourse(db: Tx, courseId: string, onlyStudentIds?: string[]) {
  const course = await db.course.findUniqueOrThrow({
    where: { id: courseId },
    include: {
      subject: { include: { criteria: { orderBy: { code: "asc" } } } },
      enrollments: { where: { status: "ACTIVE" } },
    },
  });
  const { policy, boundarySets, percentBands, fiveScale } = await loadPolicy(db, course.programmeId, course.academicYearId);
  const periods = await db.gradingPeriod.findMany({
    where: { academicYearId: course.academicYearId, programmeId: course.programmeId },
    include: { contributesTo: true, categoryWeights: { include: { category: true } } },
    orderBy: { sortOrder: "asc" },
  });
  const studentIds = course.enrollments.map((e) => e.studentId).filter((id) => !onlyStudentIds || onlyStudentIds.includes(id));

  const assignments = await db.assignment.findMany({
    where: { courseId, deletedAt: null, type: { in: ["SUMMATIVE", "FORMATIVE"] } },
    include: {
      category: true,
      criteria: { include: { criterion: true } },
      evaluations: { where: { studentId: { in: studentIds } }, include: { criteria: true } },
      submissions: { where: { studentId: { in: studentIds } } },
    },
    orderBy: { dueAt: "asc" },
  });

  const reporting = periods.filter((p) => p.kind === "REPORTING");
  const cumulative = periods.filter((p) => p.kind === "CUMULATIVE");
  const gradeByPeriodStudent = new Map<string, number | null>();

  for (const period of reporting) {
    const weights: Record<string, number> = {};
    for (const cw of period.categoryWeights.filter((w) => w.courseId === null || w.courseId === courseId)) {
      if (cw.courseId === courseId || !(cw.category.code in weights)) weights[cw.category.code] = Number(cw.weight);
    }
    const pAssignments = assignments.filter((a) => a.periodId === period.id);
    for (const studentId of studentIds) {
      const criteria = course.subject.criteria.map((c) => ({ code: c.code, id: c.id, levels: [] as number[] }));
      const percentItems: { category: string; pct: number }[] = [];
      for (const a of pAssignments) {
        const ev = a.evaluations.find((e) => e.studentId === studentId);
        const sub = a.submissions.find((s) => s.studentId === studentId);
        const missedInvalid = sub?.status === "MISSED_INVALID";
        const counted = ev && (ev.status === "EVALUATED" || ev.status === "SHARED");
        if (a.type === "SUMMATIVE" || policy.allowFormativeInFinal) {
          for (const ac of a.criteria) {
            const bucket = criteria.find((c) => c.id === ac.criterionId);
            if (!bucket) continue;
            if (missedInvalid) bucket.levels.push(0);
            else if (counted) {
              const ce = ev!.criteria.find((x) => x.criterionId === ac.criterionId);
              if (ce?.level != null) bucket.levels.push(ce.level);
            }
          }
        }
        if (a.maxScore && a.category) {
          if (missedInvalid) percentItems.push({ category: a.category.code, pct: 0 });
          else if (counted && ev!.score != null) {
            percentItems.push({ category: a.category.code, pct: (Number(ev!.score) / Number(a.maxScore)) * 100 });
          }
        }
      }
      const r = computeTermGrade({
        criteria: criteria.map((c) => ({ code: c.code, levels: c.levels })),
        aggregation: policy.criterionAggregation as Aggregation,
        boundarySets,
        percentItems,
        categoryWeights: weights,
        percentBands,
        useCriteriaMethod: policy.useCriteriaMethod,
        usePercentMethod: policy.usePercentMethod,
      });
      const grade5 = toDependentScale(r.grade7, fiveScale);
      const pg = await db.periodGrade.upsert({
        where: { courseId_studentId_periodId: { courseId, studentId, periodId: period.id } },
        create: {
          courseId, studentId, periodId: period.id,
          criteriaSum: r.criteriaSum, criteriaCount: r.criteriaCount, overallPct: r.overallPct,
          grade7: r.grade7, grade5, calculatedAt: new Date(),
        },
        update: {
          criteriaSum: r.criteriaSum, criteriaCount: r.criteriaCount, overallPct: r.overallPct,
          grade7: r.grade7, grade5, calculatedAt: new Date(),
        },
      });
      for (const c of criteria) {
        const level = r.criterionLevels[c.code] ?? null;
        await db.criterionGrade.upsert({
          where: { periodGradeId_criterionId: { periodGradeId: pg.id, criterionId: c.id } },
          create: { periodGradeId: pg.id, criterionId: c.id, level },
          update: { level },
        });
      }
      gradeByPeriodStudent.set(`${period.id}:${studentId}`, pg.gradeOverride7 ?? r.grade7);
    }
  }

  // Накопительные периоды в порядке sortOrder (S1/S2 до Final). contributesTo — строки, где этот период «родитель».
  for (const period of cumulative) {
    for (const studentId of studentIds) {
      const parts = period.contributesTo.map((c) => ({
        grade: gradeByPeriodStudent.get(`${c.childId}:${studentId}`) ?? null,
        weight: Number(c.weight),
      }));
      const grade7 = combinePeriodGrades(parts);
      const grade5 = toDependentScale(grade7, fiveScale);
      const pg = await db.periodGrade.upsert({
        where: { courseId_studentId_periodId: { courseId, studentId, periodId: period.id } },
        create: { courseId, studentId, periodId: period.id, grade7, grade5, calculatedAt: new Date() },
        update: { grade7, grade5, calculatedAt: new Date() },
      });
      gradeByPeriodStudent.set(`${period.id}:${studentId}`, pg.gradeOverride7 ?? grade7);
    }
  }
}

/** Пересчёт 5-балльной для override, использует шкалу программы. */
export async function fiveFor(db: Tx, programmeId: string, grade7: number | null) {
  const five = await db.gradeScale.findFirst({ where: { programmeId, type: "DEPENDENT" }, include: { entries: true } });
  return toDependentScale(grade7, (five?.entries ?? []).map((e) => ({ label: e.label, value: Number(e.numericValue ?? e.label), sourceValues: e.sourceValues })));
}
