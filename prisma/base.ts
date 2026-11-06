/**
 * Базовая настройка школы без людей: программы MYP/DP, учебный год 2026-27 и периоды,
 * политика оценивания, шкалы, категории и веса, пороги, коды посещаемости.
 * Используется и демо-заполнением (prisma/seed.ts), и настройкой рабочей школы (scripts/setup-school.ts).
 * Все значения потом меняются в таблицах (политика — данные, а не код).
 */
import type { PrismaClient } from "@prisma/client";
import { MYP_BOUNDARIES, PERCENT_BANDS, FIVE_SCALE, CATEGORY_WEIGHTS } from "../src/lib/grading/defaults";

const D = (s: string) => new Date(`${s}T00:00:00.000Z`);
const I = (ru: string, en: string, kk?: string) => ({ ru, en, kk: kk ?? ru });

export async function createSchoolBase(db: PrismaClient, opts: { name: { ru: string; en: string; kk: string }; code: string }) {
  // ---------- школа, программы, год ----------
  const school = await db.school.create({ data: { name: opts.name, code: opts.code, timezone: "Asia/Almaty" } });
  const myp = await db.programme.create({ data: { schoolId: school.id, code: "MYP", name: I("Программа средних классов (MYP)", "Middle Years Programme", "Орта жылдар бағдарламасы (MYP)") } });
  const dp = await db.programme.create({ data: { schoolId: school.id, code: "DP", name: I("Дипломная программа (DP)", "Diploma Programme", "Дипломдық бағдарлама (DP)") } });
  const year = await db.academicYear.create({ data: { schoolId: school.id, name: "2026-27", startDate: D("2026-09-01"), endDate: D("2027-05-25"), isCurrent: true } });

  for (const m of ["messaging", "portfolio", "insights", "ai"]) {
    await db.schoolModuleToggle.create({ data: { schoolId: school.id, moduleKey: m, enabled: m === "messaging" } });
  }

  // ---------- периоды ----------
  const periodDefs = [
    { abbreviation: "T1", name: "Term 1", kind: "REPORTING", start: "2026-09-01", end: "2026-10-24", sortOrder: 1 },
    { abbreviation: "T2", name: "Term 2", kind: "REPORTING", start: "2026-11-02", end: "2026-12-26", sortOrder: 2 },
    { abbreviation: "S1", name: "Semester 1", kind: "CUMULATIVE", start: "2026-09-01", end: "2026-12-26", sortOrder: 3 },
    { abbreviation: "T3", name: "Term 3", kind: "REPORTING", start: "2027-01-11", end: "2027-03-19", sortOrder: 4 },
    { abbreviation: "T4", name: "Term 4", kind: "REPORTING", start: "2027-03-30", end: "2027-05-25", sortOrder: 5 },
    { abbreviation: "S2", name: "Semester 2", kind: "CUMULATIVE", start: "2027-01-11", end: "2027-05-25", sortOrder: 6 },
    { abbreviation: "FY", name: "Final", kind: "CUMULATIVE", start: "2026-09-01", end: "2027-05-25", sortOrder: 7 },
  ] as const;
  const periods: Record<string, Record<string, string>> = { MYP: {}, DP: {} };
  const formative = await db.gradingCategory.create({ data: { schoolId: school.id, code: "FORMATIVE", name: I("Формативное", "Formative", "Қалыптастырушы") } });
  const summative = await db.gradingCategory.create({ data: { schoolId: school.id, code: "SUMMATIVE", name: I("Суммативное", "Summative", "Жиынтық") } });

  for (const prog of [myp, dp]) {
    for (const p of periodDefs) {
      const gp = await db.gradingPeriod.create({
        data: { academicYearId: year.id, programmeId: prog.id, name: p.name, abbreviation: p.abbreviation, kind: p.kind, startDate: D(p.start), endDate: D(p.end), sortOrder: p.sortOrder },
      });
      periods[prog.code][p.abbreviation] = gp.id;
      if (p.kind === "REPORTING") {
        await db.categoryWeight.create({ data: { categoryId: formative.id, periodId: gp.id, weight: CATEGORY_WEIGHTS.FORMATIVE } });
        await db.categoryWeight.create({ data: { categoryId: summative.id, periodId: gp.id, weight: CATEGORY_WEIGHTS.SUMMATIVE } });
      }
    }
    const P = periods[prog.code];
    const contrib = [["S1", "T1", 1], ["S1", "T2", 1], ["S2", "T3", 1], ["S2", "T4", 1], ["FY", "S1", 0.5], ["FY", "S2", 0.5]] as const;
    for (const [parent, child, weight] of contrib) {
      await db.periodContribution.create({ data: { parentId: P[parent], childId: P[child], weight } });
    }

    // ---------- политика оценивания ----------
    const policy = await db.gradingPolicy.create({
      data: {
        programmeId: prog.id, academicYearId: year.id,
        useCriteriaMethod: prog.code === "MYP", usePercentMethod: true,
        examWeight: prog.code === "MYP" ? 0.5 : null, validFrom: D("2026-09-01"),
      },
    });
    for (const [count, list] of Object.entries(MYP_BOUNDARIES)) {
      await db.gradeBoundarySet.create({ data: { policyId: policy.id, criteriaCount: Number(count), boundaries: { create: list } } });
    }
    for (const b of PERCENT_BANDS) await db.percentGradeBand.create({ data: { policyId: policy.id, ...b } });

    const ib = await db.gradeScale.create({
      data: {
        programmeId: prog.id, code: "IB_1_7", name: I("IB 1–7", "IB 1–7"), minValue: 1, maxValue: 7,
        entries: { create: [1, 2, 3, 4, 5, 6, 7].map((g) => ({ label: String(g), numericValue: g, sortOrder: g })) },
      },
    });
    await db.gradeScale.create({
      data: {
        programmeId: prog.id, code: "FIVE", name: I("5-балльная шкала", "5-point scale", "5 балдық шкала"), type: "DEPENDENT", sourceScaleId: ib.id, minValue: 2, maxValue: 5,
        entries: { create: FIVE_SCALE.map((e, i) => ({ label: e.label, numericValue: e.value, sourceValues: e.sourceValues, sortOrder: i })) },
      },
    });
    await db.performanceThreshold.create({ data: { programmeId: prog.id, metric: "IB_GRADE", value: 4 } });
    if (prog.code === "DP") {
      await db.performanceThreshold.create({ data: { programmeId: prog.id, metric: "IB_TOTAL", value: 24 } });
      await db.performanceThreshold.create({ data: { programmeId: prog.id, metric: "SCORE_PCT", value: 40 } });
    }
  }
  // ---------- коды посещаемости ----------
  const codes = {
    P: await db.attendanceCode.create({ data: { schoolId: school.id, code: "P", name: I("Присутствует", "Present", "Қатысады"), kind: "PRESENT", countsAsPresent: true, color: "#16a34a" } }),
    A: await db.attendanceCode.create({ data: { schoolId: school.id, code: "A", name: I("Отсутствует", "Absent", "Қатыспады"), kind: "ABSENT", color: "#dc2626" } }),
    L: await db.attendanceCode.create({ data: { schoolId: school.id, code: "L", name: I("Опоздание", "Late", "Кешікті"), kind: "LATE", countsAsPresent: true, color: "#d97706" } }),
    E: await db.attendanceCode.create({ data: { schoolId: school.id, code: "E", name: I("Уважительная", "Excused", "Себепті"), kind: "EXCUSED", color: "#2563eb" } }),
    O: await db.attendanceCode.create({ data: { schoolId: school.id, code: "O", name: I("Олимпиада", "Olympiad", "Олимпиада"), kind: "OLYMPIAD", countsAsPresent: true, color: "#7c3aed" } }),
  };
  await db.attendanceTier.createMany({
    data: [
      { schoolId: school.id, name: "Excellent", minPct: 95, maxPct: 100, color: "#16a34a" },
      { schoolId: school.id, name: "Good", minPct: 90, maxPct: 94.99, color: "#65a30d" },
      { schoolId: school.id, name: "At risk", minPct: 0, maxPct: 89.99, color: "#dc2626" },
    ],
  });

  return { school, myp, dp, year, periods, formative, summative, codes };
}
