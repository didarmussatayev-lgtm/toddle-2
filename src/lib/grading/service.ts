import type { PrismaClient, Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
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

type PgRow = { id: string; studentId: string; periodId: string; criteriaSum: number | null; criteriaCount: number | null; overallPct: number | null; grade7: number | null; grade5: number | null; gradeOverride7: number | null };
type Calc = { criteriaSum: number | null; criteriaCount: number | null; overallPct: number | null; grade7: number | null; grade5: number | null };

const same = (a: PgRow | undefined, c: Calc) =>
  !!a && a.criteriaSum === c.criteriaSum && a.criteriaCount === c.criteriaCount && a.grade7 === c.grade7 && a.grade5 === c.grade5 &&
  (a.overallPct == null ? c.overallPct == null : c.overallPct != null && Math.abs(a.overallPct - c.overallPct) < 0.005);

/**
 * Пересчитать итоги курса за все периоды (reporting → cumulative).
 * Всё считается в памяти за несколько запросов; в БД пишутся только изменившиеся строки.
 * Override и флаг публикации не трогаются.
 */
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
  if (studentIds.length === 0) return { written: 0 };

  const [assignments, existingRaw] = await Promise.all([
    db.assignment.findMany({
      where: { courseId, deletedAt: null, type: { in: ["SUMMATIVE", "FORMATIVE"] } },
      select: {
        id: true, type: true, periodId: true, maxScore: true,
        category: { select: { code: true } },
        criteria: { select: { criterionId: true } },
        evaluations: { where: { studentId: { in: studentIds } }, select: { studentId: true, status: true, score: true, criteria: { select: { criterionId: true, level: true } } } },
        submissions: { where: { studentId: { in: studentIds }, status: "MISSED_INVALID" }, select: { studentId: true } },
      },
      orderBy: { dueAt: "asc" },
    }),
    db.periodGrade.findMany({
      where: { courseId, studentId: { in: studentIds } },
      select: { id: true, studentId: true, periodId: true, criteriaSum: true, criteriaCount: true, overallPct: true, grade7: true, grade5: true, gradeOverride7: true, criterionGrades: { select: { criterionId: true, level: true } } },
    }),
  ]);
  const existing = new Map(existingRaw.map((r) => [`${r.periodId}:${r.studentId}`, { ...r, overallPct: r.overallPct == null ? null : Number(r.overallPct) }]));

  // индексы для быстрого доступа
  const evalIdx = new Map<string, (typeof assignments)[number]["evaluations"][number]>();
  const missedIdx = new Set<string>();
  for (const a of assignments) {
    for (const e of a.evaluations) evalIdx.set(`${a.id}:${e.studentId}`, e);
    for (const m of a.submissions) missedIdx.add(`${a.id}:${m.studentId}`);
  }

  const computed: { periodId: string; studentId: string; calc: Calc; levels?: Map<string, number | null> }[] = [];
  const effectiveGrade = new Map<string, number | null>();

  for (const period of periods.filter((p) => p.kind === "REPORTING")) {
    const weights: Record<string, number> = {};
    for (const cw of period.categoryWeights.filter((w) => w.courseId === null || w.courseId === courseId)) {
      if (cw.courseId === courseId || !(cw.category.code in weights)) weights[cw.category.code] = Number(cw.weight);
    }
    const pAssignments = assignments.filter((a) => a.periodId === period.id);
    for (const studentId of studentIds) {
      const buckets = new Map(course.subject.criteria.map((c) => [c.id, [] as number[]]));
      const percentItems: { category: string; pct: number }[] = [];
      for (const a of pAssignments) {
        const ev = evalIdx.get(`${a.id}:${studentId}`);
        const missedInvalid = missedIdx.has(`${a.id}:${studentId}`);
        const counted = ev && (ev.status === "EVALUATED" || ev.status === "SHARED");
        if (a.type === "SUMMATIVE" || policy.allowFormativeInFinal) {
          for (const ac of a.criteria) {
            const bucket = buckets.get(ac.criterionId);
            if (!bucket) continue;
            if (missedInvalid) bucket.push(0);
            else if (counted) {
              const lvl = ev!.criteria.find((x) => x.criterionId === ac.criterionId)?.level;
              if (lvl != null) bucket.push(lvl);
            }
          }
        }
        if (a.maxScore && a.category) {
          if (missedInvalid) percentItems.push({ category: a.category.code, pct: 0 });
          else if (counted && ev!.score != null) percentItems.push({ category: a.category.code, pct: (Number(ev!.score) / Number(a.maxScore)) * 100 });
        }
      }
      const r = computeTermGrade({
        criteria: course.subject.criteria.map((c) => ({ code: c.code, levels: buckets.get(c.id)! })),
        aggregation: policy.criterionAggregation as Aggregation,
        boundarySets, percentItems, categoryWeights: weights, percentBands,
        useCriteriaMethod: policy.useCriteriaMethod, usePercentMethod: policy.usePercentMethod,
      });
      const levels = new Map(course.subject.criteria.map((c) => [c.id, r.criterionLevels[c.code] ?? null]));
      const calc: Calc = { criteriaSum: r.criteriaSum, criteriaCount: r.criteriaCount, overallPct: r.overallPct, grade7: r.grade7, grade5: toDependentScale(r.grade7, fiveScale) };
      computed.push({ periodId: period.id, studentId, calc, levels });
      const ov = existing.get(`${period.id}:${studentId}`)?.gradeOverride7;
      effectiveGrade.set(`${period.id}:${studentId}`, ov ?? r.grade7);
    }
  }
  // Накопительные периоды по sortOrder (S1/S2 до Final). contributesTo — строки, где этот период «родитель».
  for (const period of periods.filter((p) => p.kind === "CUMULATIVE")) {
    for (const studentId of studentIds) {
      const grade7 = combinePeriodGrades(period.contributesTo.map((c) => ({ grade: effectiveGrade.get(`${c.childId}:${studentId}`) ?? null, weight: Number(c.weight) })));
      computed.push({ periodId: period.id, studentId, calc: { criteriaSum: null, criteriaCount: null, overallPct: null, grade7, grade5: toDependentScale(grade7, fiveScale) } });
      const ov = existing.get(`${period.id}:${studentId}`)?.gradeOverride7;
      effectiveGrade.set(`${period.id}:${studentId}`, ov ?? grade7);
    }
  }

  // Запись только изменений
  const now = new Date();
  const toCreate: Prisma.PeriodGradeCreateManyInput[] = [];
  const cgCreate: Prisma.CriterionGradeCreateManyInput[] = [];
  const ops: Prisma.PrismaPromise<unknown>[] = [];
  for (const c of computed) {
    const key = `${c.periodId}:${c.studentId}`;
    const ex = existing.get(key);
    if (!ex) {
      const id = randomUUID();
      toCreate.push({ id, courseId, studentId: c.studentId, periodId: c.periodId, ...c.calc, calculatedAt: now });
      if (c.levels) for (const [criterionId, level] of c.levels) cgCreate.push({ periodGradeId: id, criterionId, level });
      continue;
    }
    if (!same(ex, c.calc)) ops.push(db.periodGrade.update({ where: { id: ex.id }, data: { ...c.calc, calculatedAt: now } }));
    if (c.levels) {
      for (const [criterionId, level] of c.levels) {
        const old = ex.criterionGrades.find((g) => g.criterionId === criterionId);
        if (!old) cgCreate.push({ periodGradeId: ex.id, criterionId, level });
        else if (old.level !== level) ops.push(db.criterionGrade.update({ where: { periodGradeId_criterionId: { periodGradeId: ex.id, criterionId } }, data: { level } }));
      }
    }
  }
  if (toCreate.length) await db.periodGrade.createMany({ data: toCreate });
  if (cgCreate.length) await db.criterionGrade.createMany({ data: cgCreate, skipDuplicates: true });
  // Пакетно: Prisma отправляет операции одной транзакцией, если это не уже открытая транзакция
  if (ops.length) {
    if ("$transaction" in db) await (db as PrismaClient).$transaction(ops);
    else for (const op of ops) await op;
  }
  return { written: toCreate.length + cgCreate.length + ops.length };
}

/** Пересчёт 5-балльной для override, использует шкалу программы. */
export async function fiveFor(db: Tx, programmeId: string, grade7: number | null) {
  const five = await db.gradeScale.findFirst({ where: { programmeId, type: "DEPENDENT" }, include: { entries: true } });
  return toDependentScale(grade7, (five?.entries ?? []).map((e) => ({ label: e.label, value: Number(e.numericValue ?? e.label), sourceValues: e.sourceValues })));
}
