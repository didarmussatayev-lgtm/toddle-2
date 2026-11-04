/* Демо-данные школы. Все люди вымышленные. Запуск: npm run db:reset */
import { PrismaClient, Prisma } from "@prisma/client";
import { MYP_BOUNDARIES, PERCENT_BANDS, FIVE_SCALE, CATEGORY_WEIGHTS } from "../src/lib/grading/defaults";
import { recalcCourse } from "../src/lib/grading/service";

const db = new PrismaClient();

// ---------- детерминированный генератор ----------
let seed = 20262027;
/** mulberry32 — воспроизводимый ГПСЧ */
const rnd = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const D = (s: string) => new Date(`${s}T00:00:00.000Z`);
const I = (ru: string, en: string, kk?: string) => ({ ru, en, kk: kk ?? ru });

// ---------- имена ----------
const maleFirst = ["Алихан", "Арман", "Данияр", "Ерлан", "Тимур", "Нурсултан", "Ислам", "Максим", "Артём", "Санжар", "Бекзат", "Руслан", "Дамир", "Азамат", "Ильяс", "Мирас", "Адиль", "Кирилл"];
const femaleFirst = ["Айгерим", "Амина", "Дана", "Жанель", "Алия", "Мадина", "Камила", "София", "Анель", "Томирис", "Асель", "Дарина", "Айлин", "Сабина", "Аружан", "Виктория", "Малика", "Инкар"];
const lastNames = ["Ахметов", "Серикбаев", "Жумабеков", "Касымов", "Нурланов", "Оспанов", "Сейткали", "Абенов", "Иванов", "Ким", "Тулегенов", "Муратов", "Бекова", "Исаев", "Жаксылыков", "Смагулов", "Ермеков", "Байжанов", "Каримов", "Алиев", "Петров", "Есенов", "Кудайберген", "Рахимов"];
const fem = (ln: string) => (ln.endsWith("ов") || ln.endsWith("ев") || ln.endsWith("ин") ? ln + "а" : ln);

async function main() {
  console.log("Очистка…");
  const tables = await db.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname='public'`;
  await db.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(",")} CASCADE`);

  // ---------- школа, программы, год ----------
  const school = await db.school.create({ data: { name: I("Лицей «Демо»", "Demo Lyceum", "«Демо» лицейі"), code: "DEMO", timezone: "Asia/Almaty" } });
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
  // T1 MYP и DP закрыт и заблокирован
  await db.gradingPeriod.updateMany({ where: { abbreviation: "T1" }, data: { locked: true } });

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

  // ---------- пользователи-сотрудники ----------
  let uidCounter = 1;
  const mkUser = async (firstName: string, lastName: string, email: string, extra: Partial<Prisma.UserCreateInput> = {}) =>
    db.user.create({
      data: { school: { connect: { id: school.id } }, firstName, lastName, email, status: "ACTIVE", uid: `SCH-${String(uidCounter++).padStart(6, "0")}`, ...extra },
    });
  const mkStaff = async (firstName: string, lastName: string, email: string, title: string, roles: Prisma.RoleAssignmentCreateWithoutUserInput[]) => {
    const u = await mkUser(firstName, lastName, email);
    const sp = await db.staffProfile.create({ data: { userId: u.id, displayTitle: title } });
    for (const r of roles) await db.roleAssignment.create({ data: { ...r, user: { connect: { id: u.id } } } as Prisma.RoleAssignmentCreateInput });
    return { user: u, staff: sp };
  };

  await mkStaff("Гульнара", "Сапарова", "admin@demo.school", "Администратор системы", [{ role: "SCHOOL_ADMIN" }]);
  await mkStaff("Айжан", "Мусина", "myp.coord@demo.school", "Координатор MYP", [{ role: "COORDINATOR", programme: { connect: { id: myp.id } } }, { role: "TEACHER" }]);
  await mkStaff("Ричард", "Коллинз", "dp.coord@demo.school", "Координатор DP", [{ role: "COORDINATOR", programme: { connect: { id: dp.id } } }, { role: "TEACHER" }]);
  await mkStaff("Ольга", "Ким", "deputy@demo.school", "Завуч по учебной работе", [{ role: "DEPUTY_HEAD" }]);

  const T = {
    math: await mkStaff("Ерлан", "Бекмуханов", "math@demo.school", "Учитель математики", [{ role: "TEACHER" }]),
    sci: await mkStaff("Наталья", "Орлова", "science@demo.school", "Учитель естественных наук", [{ role: "TEACHER" }]),
    lit: await mkStaff("Сауле", "Жанибекова", "russian@demo.school", "Учитель русского языка и литературы", [{ role: "TEACHER" }, { role: "HOMEROOM_ADVISOR" }]),
    eng: await mkStaff("Джеймс", "Уокер", "english@demo.school", "Учитель английского языка", [{ role: "TEACHER" }]),
    ind: await mkStaff("Марат", "Тулеуов", "history@demo.school", "Учитель истории и обществознания", [{ role: "TEACHER" }, { role: "HOMEROOM_ADVISOR" }]),
    des: await mkStaff("Дина", "Ахметжанова", "design@demo.school", "Учитель дизайна", [{ role: "TEACHER" }]),
    kaz: await mkStaff("Айгуль", "Нурпеисова", "kazakh@demo.school", "Учитель казахского языка", [{ role: "TEACHER" }]),
    phys: await mkStaff("Виктор", "Соколов", "physics@demo.school", "Учитель физики (DP)", [{ role: "TEACHER" }]),
  };

  // ---------- предметные группы, предметы, критерии ----------
  const sg = async (code: string, ru: string, en: string, kk: string, sortOrder: number) =>
    db.subjectGroup.create({ data: { schoolId: school.id, code, name: I(ru, en, kk), sortOrder } });
  const G = {
    LL: await sg("LANG_LIT", "Язык и литература", "Language and literature", "Тіл және әдебиет", 1),
    LA: await sg("LANG_ACQ", "Изучение языка", "Language acquisition", "Тілді меңгеру", 2),
    IS: await sg("INDIV_SOC", "Индивидуумы и общества", "Individuals and societies", "Жеке тұлға және қоғам", 3),
    SC: await sg("SCIENCES", "Естественные науки", "Sciences", "Жаратылыстану ғылымдары", 4),
    MA: await sg("MATH", "Математика", "Mathematics", "Математика", 5),
    DE: await sg("DESIGN", "Дизайн", "Design", "Дизайн", 6),
  };
  type Crit = [string, string, string, string]; // code, ru, en, kk
  const mypSubjects: { key: keyof typeof T; group: { id: string }; name: [string, string, string]; criteria: Crit[]; hours: number }[] = [
    { key: "math", group: G.MA, name: ["Математика", "Mathematics", "Математика"], hours: 5, criteria: [["A", "Знание и понимание", "Knowing and understanding", "Білу және түсіну"], ["B", "Исследование закономерностей", "Investigating patterns", "Заңдылықтарды зерттеу"], ["C", "Коммуникация", "Communicating", "Коммуникация"], ["D", "Применение математики в реальных ситуациях", "Applying mathematics in real-life contexts", "Математиканы өмірлік жағдайларда қолдану"]] },
    { key: "sci", group: G.SC, name: ["Естественные науки", "Sciences", "Жаратылыстану"], hours: 4, criteria: [["A", "Знание и понимание", "Knowing and understanding", "Білу және түсіну"], ["B", "Исследование и планирование", "Inquiring and designing", "Зерттеу және жоспарлау"], ["C", "Обработка и оценка", "Processing and evaluating", "Өңдеу және бағалау"], ["D", "Влияние науки", "Reflecting on the impacts of science", "Ғылымның әсері туралы ой толғау"]] },
    { key: "lit", group: G.LL, name: ["Русский язык и литература", "Russian language and literature", "Орыс тілі мен әдебиеті"], hours: 4, criteria: [["A", "Анализ", "Analysing", "Талдау"], ["B", "Организация", "Organizing", "Ұйымдастыру"], ["C", "Создание текста", "Producing text", "Мәтін құру"], ["D", "Использование языка", "Using language", "Тілді қолдану"]] },
    { key: "eng", group: G.LA, name: ["Английский язык", "English language acquisition", "Ағылшын тілі"], hours: 4, criteria: [["A", "Аудирование", "Listening", "Тыңдалым"], ["B", "Чтение", "Reading", "Оқылым"], ["C", "Говорение", "Speaking", "Айтылым"], ["D", "Письмо", "Writing", "Жазылым"]] },
    { key: "ind", group: G.IS, name: ["Индивидуумы и общества", "Individuals and societies", "Жеке тұлға және қоғам"], hours: 3, criteria: [["A", "Знание и понимание", "Knowing and understanding", "Білу және түсіну"], ["B", "Исследование", "Investigating", "Зерттеу"], ["C", "Коммуникация", "Communicating", "Коммуникация"], ["D", "Критическое мышление", "Thinking critically", "Сыни ойлау"]] },
    { key: "des", group: G.DE, name: ["Дизайн", "Design", "Дизайн"], hours: 2, criteria: [["A", "Исследование и анализ", "Inquiring and analysing", "Зерттеу және талдау"], ["B", "Разработка идей", "Developing ideas", "Идеяларды әзірлеу"], ["C", "Создание решения", "Creating the solution", "Шешім жасау"], ["D", "Оценка", "Evaluating", "Бағалау"]] },
    { key: "kaz", group: G.LA, name: ["Казахский язык", "Kazakh language", "Қазақ тілі"], hours: 3, criteria: [["A", "Аудирование", "Listening", "Тыңдалым"], ["B", "Чтение", "Reading", "Оқылым"], ["C", "Говорение", "Speaking", "Айтылым"], ["D", "Письмо", "Writing", "Жазылым"]] },
  ];
  const subjectIds: Record<string, string> = {};
  const criteriaBySubject: Record<string, { id: string; code: string }[]> = {};
  for (const s of mypSubjects) {
    const subj = await db.subject.create({ data: { programmeId: myp.id, subjectGroupId: s.group.id, name: I(s.name[0], s.name[1], s.name[2]) } });
    subjectIds[s.key] = subj.id;
    criteriaBySubject[subj.id] = [];
    for (const [code, ru, en, kk] of s.criteria) {
      const c = await db.criterion.create({
        data: {
          subjectId: subj.id, code, name: I(ru, en, kk), maxLevel: 8,
          descriptors: {
            create: [
              { levelFrom: 0, levelTo: 0, text: I("Не достигает ни одного дескриптора", "Does not reach a standard described", "Ешбір дескрипторға жетпейді") },
              { levelFrom: 1, levelTo: 2, text: I("Ограниченный уровень", "Limited", "Шектеулі деңгей") },
              { levelFrom: 3, levelTo: 4, text: I("Достаточный уровень", "Adequate", "Жеткілікті деңгей") },
              { levelFrom: 5, levelTo: 6, text: I("Существенный уровень", "Substantial", "Елеулі деңгей") },
              { levelFrom: 7, levelTo: 8, text: I("Отличный уровень", "Excellent", "Өте жақсы деңгей") },
            ],
          },
        },
      });
      criteriaBySubject[subj.id].push({ id: c.id, code });
    }
  }
  const dpSubjects = [
    { key: "dpmath", teacher: T.math, group: G.MA, name: ["Математика: анализ и подходы", "Mathematics: analysis and approaches", "Математика: талдау және тәсілдер"], level: "SL" as const, hours: 4 },
    { key: "dpphys", teacher: T.phys, group: G.SC, name: ["Физика", "Physics", "Физика"], level: "HL" as const, hours: 5 },
    { key: "dpeng", teacher: T.eng, group: G.LA, name: ["Английский B", "English B", "Ағылшын B"], level: "HL" as const, hours: 4 },
    { key: "dplit", teacher: T.lit, group: G.LL, name: ["Русский A: литература", "Russian A: literature", "Орыс A: әдебиет"], level: "SL" as const, hours: 3 },
  ];
  for (const s of dpSubjects) {
    const subj = await db.subject.create({ data: { programmeId: dp.id, subjectGroupId: s.group.id, name: I(s.name[0], s.name[1], s.name[2]), firstAssessment: 2021 } });
    subjectIds[s.key] = subj.id;
    criteriaBySubject[subj.id] = [];
  }

  // ---------- параллели, классы, ученики, родители ----------
  const classes: { name: string; grade: number; prog: typeof myp; size: number; advisor: { staff: { id: string } } }[] = [
    { name: "7A", grade: 7, prog: myp, size: 16, advisor: T.lit },
    { name: "7B", grade: 7, prog: myp, size: 15, advisor: T.ind },
    { name: "8A", grade: 8, prog: myp, size: 14, advisor: T.sci },
    { name: "DP1", grade: 11, prog: dp, size: 10, advisor: T.phys },
  ];
  const yearGroups: Record<number, string> = {};
  const homerooms: { id: string; name: string; prog: typeof myp; grade: number; students: { id: string; ability: number }[] }[] = [];
  let studentIdx = 0;
  let firstGuardianShared: string | null = null;
  let sharedBase = "";
  for (const cl of classes) {
    if (!yearGroups[cl.grade]) {
      const gradYear = cl.prog.code === "DP" ? 2028 : 2026 + (12 - cl.grade);
      const yg = await db.yearGroup.create({ data: { programmeId: cl.prog.id, batchLabel: `Batch of ${gradYear}`, graduationYear: gradYear } });
      await db.yearGroupYear.create({ data: { yearGroupId: yg.id, academicYearId: year.id, gradeLabel: cl.prog.code === "DP" ? "DP 1" : `Grade ${cl.grade}`, gradeNumber: cl.grade } });
      yearGroups[cl.grade] = yg.id;
    }
    const group = await db.studentGroup.create({ data: { yearGroupId: yearGroups[cl.grade], academicYearId: year.id, kind: "HOMEROOM", name: cl.name } });
    const hr = { id: group.id, name: cl.name, prog: cl.prog, grade: cl.grade, students: [] as { id: string; ability: number }[] };
    for (let i = 0; i < cl.size; i++) {
      studentIdx++;
      const female = rnd() < 0.5;
      const sibling = cl.name === "8A" && i === 0 && !!firstGuardianShared;
      const ln = sibling ? sharedBase : pick(lastNames);
      const firstName = female ? pick(femaleFirst) : pick(maleFirst);
      const lastName = female ? fem(ln) : ln;
      const u = await mkUser(firstName, lastName, `student${studentIdx}@demo.school`);
      const sp = await db.studentProfile.create({
        data: { userId: u.id, studentUid: `ST-${String(studentIdx).padStart(4, "0")}`, gender: female ? "F" : "M", birthDate: D(`${2026 - cl.grade - 6}-0${1 + (i % 9)}-1${i % 9}`), enrolledAt: D("2026-09-01") },
      });
      await db.groupMember.create({ data: { groupId: group.id, studentId: sp.id } });
      await db.studentAdvisor.create({ data: { academicYearId: year.id, studentId: sp.id, staffId: cl.advisor.staff.id } });
      // способность ученика 2.5..7.5 (средний уровень критерия)
      hr.students.push({ id: sp.id, ability: clamp(3 + rnd() * 4.5 + (rnd() - 0.5), 1.5, 7.8) });

      // родитель (один на ученика; у первого родителя — двое детей: 7A и 8A)
      await db.roleAssignment.create({ data: { userId: u.id, role: "STUDENT" } });
      if (sibling) {
        await db.studentGuardian.create({ data: { studentId: sp.id, guardianId: firstGuardianShared!, relation: "мать", approved: true, connectedAt: new Date() } });
        continue;
      }
      const pFemale = cl.name === "7A" && i === 0 ? true : rnd() < 0.6;
      const pu = await mkUser(pFemale ? pick(femaleFirst.slice(0, 10)) : pick(maleFirst.slice(0, 10)), pFemale ? fem(ln) : ln, `parent${studentIdx}@demo.school`);
      const gp = await db.guardianProfile.create({ data: { userId: pu.id, phone: `+7 701 ${String(1000000 + studentIdx * 7919).slice(0, 7)}` } });
      await db.roleAssignment.create({ data: { userId: pu.id, role: "GUARDIAN" } });
      await db.studentGuardian.create({ data: { studentId: sp.id, guardianId: gp.id, relation: pFemale ? "мать" : "отец", approved: true, connectedAt: new Date() } });
      if (cl.name === "7A" && i === 0) { firstGuardianShared = gp.id; sharedBase = ln; }
    }
    homerooms.push(hr);
  }

  // ---------- курсы ----------
  type CourseInfo = { id: string; hr: (typeof homerooms)[number]; teacherStaffId: string; hours: number; subjectId: string; isDP: boolean; name: string };
  const courses: CourseInfo[] = [];
  const colors = ["#2563eb", "#16a34a", "#db2777", "#ea580c", "#7c3aed", "#0891b2", "#ca8a04"];
  for (const hr of homerooms) {
    const list = hr.prog.code === "MYP"
      ? mypSubjects.map((s) => ({ subjectId: subjectIds[s.key], teacher: T[s.key], hours: s.hours, nameEn: s.name[1], level: "NONE" as const }))
      : dpSubjects.map((s) => ({ subjectId: subjectIds[s.key], teacher: s.teacher, hours: s.hours, nameEn: `${s.name[1]} ${s.level}`, level: s.level }));
    for (const [i, s] of list.entries()) {
      const name = `${hr.name} ${s.nameEn}`;
      const c = await db.course.create({
        data: {
          schoolId: school.id, academicYearId: year.id, programmeId: hr.prog.id, subjectId: s.subjectId, name, classCode: `${hr.name}-${i + 1}`,
          level: s.level, color: colors[i % colors.length],
          groups: { create: { groupId: hr.id } },
          staff: { create: { staffId: s.teacher.staff.id, isPrimary: true } },
          enrollments: { create: hr.students.map((st) => ({ studentId: st.id })) },
        },
      });
      courses.push({ id: c.id, hr, teacherStaffId: s.teacher.staff.id, hours: s.hours, subjectId: s.subjectId, isDP: hr.prog.code === "DP", name });
    }
  }

  // ---------- звонки и расписание ----------
  const bell = await db.bellSchedule.create({ data: { academicYearId: year.id, name: "Regular" } });
  const times = [["08:30", "09:10"], ["09:20", "10:00"], ["10:15", "10:55"], ["11:05", "11:45"], ["12:15", "12:55"], ["13:05", "13:45"], ["13:55", "14:35"], ["14:45", "15:25"]];
  const slots: string[] = [];
  for (const [i, [s, e]] of times.entries()) {
    const tp = await db.timetablePeriod.create({ data: { schoolId: school.id, name: `P${i + 1}`, sortOrder: i + 1 } });
    const slot = await db.bellSlot.create({ data: { bellScheduleId: bell.id, periodId: tp.id, startTime: s, endTime: e } });
    slots.push(slot.id);
  }
  const routine = await db.routine.create({ data: { academicYearId: year.id, name: "5-day week", validFrom: D("2026-09-01"), validTo: D("2027-05-25"), cycleDays: 5, gradeNumbers: [7, 8, 9, 10, 11, 12] } });
  for (let d = 1; d <= 5; d++) await db.routineDay.create({ data: { routineId: routine.id, dayIndex: d, bellScheduleId: bell.id } });

  const holidays: [string, string, string][] = [
    ["2026-10-25", "2026-11-01", "Осенние каникулы"], ["2026-12-16", "2026-12-17", "День Независимости"], ["2026-12-27", "2027-01-10", "Зимние каникулы"],
    ["2027-03-08", "2027-03-08", "8 Марта"], ["2027-03-20", "2027-03-29", "Весенние каникулы (Наурыз)"], ["2027-05-01", "2027-05-01", "День единства народа"], ["2027-05-07", "2027-05-09", "День защитника / Победы"],
  ];
  const isHoliday = (iso: string) => holidays.find(([a, b]) => iso >= a && iso <= b);
  const dayRows: Prisma.ScheduleDayCreateManyInput[] = [];
  const workingDays: string[] = [];
  for (let d = D("2026-09-01"); d <= D("2027-05-25"); d = new Date(d.getTime() + 86400000)) {
    const iso = d.toISOString().slice(0, 10);
    const wd = d.getUTCDay(); // 0=Вс
    const h = isHoliday(iso);
    if (wd === 0 || wd === 6) continue;
    if (h) { dayRows.push({ academicYearId: year.id, date: d, isNonWorking: true, label: h[2] }); continue; }
    dayRows.push({ academicYearId: year.id, date: d, dayIndex: wd, bellScheduleId: bell.id });
    workingDays.push(iso);
  }
  await db.scheduleDay.createMany({ data: dayRows });

  // жадное заполнение сетки: класс × день × урок, без пересечений учителей
  const teacherBusy = new Set<string>();
  const entries: { courseId: string; dayIndex: number; slotIdx: number; hr: string }[] = [];
  const rooms: Record<string, string> = {};
  for (const hr of homerooms) {
    const hrCourses = courses.filter((c) => c.hr.id === hr.id);
    const need: CourseInfo[] = hrCourses.flatMap((c) => Array(c.hours).fill(c));
    // перемешать
    for (let i = need.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [need[i], need[j]] = [need[j], need[i]]; }
    const grid = new Set<string>();
    for (const c of need) {
      let placed = false;
      for (let attempt = 0; attempt < 80 && !placed; attempt++) {
        const day = 1 + Math.floor(rnd() * 5);
        const slotIdx = Math.floor(rnd() * 7);
        const cell = `${day}:${slotIdx}`;
        const tKey = `${c.teacherStaffId}:${cell}`;
        const sameDay = entries.filter((e) => e.courseId === c.id && e.dayIndex === day).length;
        if (grid.has(cell) || teacherBusy.has(tKey) || sameDay >= 2) continue;
        grid.add(cell); teacherBusy.add(tKey);
        entries.push({ courseId: c.id, dayIndex: day, slotIdx, hr: hr.id });
        placed = true;
      }
    }
    rooms[hr.id] = `${100 + homerooms.indexOf(hr) * 3 + 101}`;
  }
  const imp = await db.timetableImport.create({ data: { schoolId: school.id, source: "ASC_TIMETABLES", status: "SUCCEEDED", validFrom: D("2026-09-01"), validTo: D("2027-05-25"), stats: { entries: entries.length, note: "демо-генерация" } } });
  const entryRows = await Promise.all(entries.map((e) => db.timetableEntry.create({
    data: { courseId: e.courseId, slotId: slots[e.slotIdx], dayIndex: e.dayIndex, room: rooms[e.hr], teacherId: courses.find((c) => c.id === e.courseId)!.teacherStaffId, validFrom: D("2026-09-01"), validTo: D("2027-05-25"), importId: imp.id },
  })));

  // ---------- посещаемость: все рабочие дни до вчерашнего ----------
  const todayIso = new Date().toISOString().slice(0, 10);
  const pastDays = workingDays.filter((d) => d < todayIso);
  console.log(`Посещаемость за ${pastDays.length} дней…`);
  const sessionRows: Prisma.AttendanceSessionCreateManyInput[] = [];
  const recordRows: Prisma.AttendanceRecordCreateManyInput[] = [];
  const staffUserByStaff = new Map((await db.staffProfile.findMany()).map((s) => [s.id, s.userId]));
  // «болезнь»: у ученика бывают пропуски на несколько дней подряд
  const sickDays = new Map<string, Set<string>>();
  for (const hr of homerooms) for (const s of hr.students) {
    const set = new Set<string>();
    const episodes = rnd() < 0.5 ? 1 : rnd() < 0.3 ? 2 : 0;
    for (let k = 0; k < episodes; k++) { const start = Math.floor(rnd() * Math.max(1, pastDays.length - 3)); for (let j = 0; j < 1 + Math.floor(rnd() * 3); j++) if (pastDays[start + j]) set.add(pastDays[start + j]); }
    sickDays.set(s.id, set);
  }
  for (const day of pastDays) {
    const wd = D(day).getUTCDay();
    for (const [i, e] of entries.entries()) {
      if (e.dayIndex !== wd) continue;
      const entry = entryRows[i];
      const id = crypto.randomUUID();
      const c = courses.find((x) => x.id === e.courseId)!;
      sessionRows.push({ id, entryId: entry.id, date: D(day), markedById: staffUserByStaff.get(c.teacherStaffId), markedAt: new Date(`${day}T10:00:00Z`) });
      for (const s of c.hr.students) {
        let code = codes.P.id;
        const r = rnd();
        if (sickDays.get(s.id)!.has(day)) code = rnd() < 0.7 ? codes.E.id : codes.A.id;
        else if (r < 0.012) code = codes.A.id;
        else if (r < 0.04) code = codes.L.id;
        else if (r < 0.045) code = codes.O.id;
        recordRows.push({ sessionId: id, studentId: s.id, codeId: code });
      }
    }
  }
  await db.attendanceSession.createMany({ data: sessionRows });
  for (let i = 0; i < recordRows.length; i += 5000) await db.attendanceRecord.createMany({ data: recordRows.slice(i, i + 5000) });

  // ---------- планировщик (минимум) и задания ----------
  const tmplMyp = await db.plannerTemplate.create({ data: { programmeId: myp.id, name: "MYP Unit", sections: [{ key: "inquiry", title: I("Исследование", "Inquiry") }] } });
  const tmplDp = await db.plannerTemplate.create({ data: { programmeId: dp.id, name: "DP Unit", sections: [{ key: "content", title: I("Содержание", "Content") }] } });
  const unitTopics: Record<string, [string, string][]> = {
    math: [["Рациональные числа", "Rational numbers"], ["Линейные уравнения", "Linear equations"]],
    sci: [["Строение вещества", "Particles and matter"], ["Энергия вокруг нас", "Energy around us"]],
    lit: [["Сказка и миф", "Tales and myths"], ["Поэзия природы", "Poetry of nature"]],
    eng: [["My community", "My community"], ["Travel and culture", "Travel and culture"]],
    ind: [["Древние цивилизации", "Ancient civilisations"], ["Шёлковый путь", "The Silk Road"]],
    des: [["Цифровой плакат", "Digital poster"], ["Упаковка продукта", "Product packaging"]],
    kaz: [["Менің отбасым", "My family"], ["Қазақстан табиғаты", "Nature of Kazakhstan"]],
    dpmath: [["Функции", "Functions"], ["Последовательности и ряды", "Sequences and series"]],
    dpphys: [["Измерения и погрешности", "Measurements and uncertainties"], ["Механика", "Mechanics"]],
    dpeng: [["Identities", "Identities"], ["Experiences", "Experiences"]],
    dplit: [["Читатели, писатели и тексты", "Readers, writers and texts"], ["Время и пространство", "Time and space"]],
  };
  const keyBySubject = Object.fromEntries(Object.entries(subjectIds).map(([k, v]) => [v, k]));
  const P = (c: CourseInfo, ab: string) => periods[c.isDP ? "DP" : "MYP"][ab];
  const comments = [
    "Хорошая структура ответа, добавь больше примеров.", "Отличная работа! Аргументы убедительны.", "Обрати внимание на точность терминологии.",
    "Нужно подробнее раскрыть вывод.", "Прогресс заметен, продолжай в том же духе.", "Оформи источники по образцу.",
  ];

  let aCount = 0;
  for (const c of courses) {
    const key = keyBySubject[c.subjectId];
    const teacherUserId = staffUserByStaff.get(c.teacherStaffId)!;
    const topics = unitTopics[key];
    const units = [];
    for (const [i, [ru, en]] of topics.entries()) {
      units.push(await db.unit.create({
        data: { courseId: c.id, templateId: c.isDP ? tmplDp.id : tmplMyp.id, title: I(ru, en), startDate: D(i === 0 ? "2026-09-01" : "2026-11-02"), endDate: D(i === 0 ? "2026-10-24" : "2026-12-26"), status: "PUBLISHED", sortOrder: i, createdById: teacherUserId },
      }));
    }
    const crit = criteriaBySubject[c.subjectId];
    const plan: { title: string; type: "SUMMATIVE" | "FORMATIVE"; period: string; due: string; crits: string[]; state: "shared" | "evaluated" | "open"; unit: number; max?: number }[] = c.isDP
      ? [
          { title: "Входная диагностика", type: "FORMATIVE", period: "T1", due: "2026-09-18", crits: [], state: "shared", unit: 0, max: 20 },
          { title: "Контрольная работа 1", type: "SUMMATIVE", period: "T1", due: "2026-10-02", crits: [], state: "shared", unit: 0, max: 50 },
          { title: "Контрольная работа 2", type: "SUMMATIVE", period: "T1", due: "2026-10-21", crits: [], state: "shared", unit: 0, max: 60 },
          { title: "Квиз по теме", type: "FORMATIVE", period: "T2", due: "2026-11-03", crits: [], state: "evaluated", unit: 1, max: 10 },
          { title: "Контрольная работа 3", type: "SUMMATIVE", period: "T2", due: "2026-11-20", crits: [], state: "open", unit: 1, max: 50 },
        ]
      : [
          { title: "Формативная работа: проверка понимания", type: "FORMATIVE", period: "T1", due: "2026-09-16", crits: ["A"], state: "shared", unit: 0 },
          { title: "Суммативная работа 1", type: "SUMMATIVE", period: "T1", due: "2026-10-01", crits: ["A", "B"], state: "shared", unit: 0 },
          { title: "Суммативная работа 2", type: "SUMMATIVE", period: "T1", due: "2026-10-20", crits: ["C", "D"], state: "shared", unit: 0 },
          { title: "Суммативная работа 3", type: "SUMMATIVE", period: "T2", due: "2026-11-03", crits: ["A", "D"], state: "evaluated", unit: 1 },
          { title: "Суммативная работа 4", type: "SUMMATIVE", period: "T2", due: "2026-11-25", crits: ["B", "C"], state: "open", unit: 1 },
        ];
    // разносим даты суммативных между курсами одного класса, чтобы не нарушать правило «≤ 3 в день»
    const shift = courses.filter((x) => x.hr.id === c.hr.id).indexOf(c);
    for (const p of plan) {
      const due = new Date(D(p.due).getTime() + (p.type === "SUMMATIVE" ? (shift % 4) * 86400000 : 0));
      if (due.getUTCDay() === 6) due.setUTCDate(due.getUTCDate() + 2);
      if (due.getUTCDay() === 0) due.setUTCDate(due.getUTCDate() + 1);
      const topic = topics[p.unit][0];
      const a = await db.assignment.create({
        data: {
          courseId: c.id, type: p.type, title: `${p.title}: ${topic}`, instructions: I(`Работа по юниту «${topic}». Критерии и дескрипторы — в рубрике.`, `Task for unit “${topics[p.unit][1]}”.`),
          periodId: P(c, p.period), categoryId: p.type === "SUMMATIVE" ? summative.id : formative.id, status: "PUBLISHED",
          publishAt: new Date(due.getTime() - 10 * 86400000), dueAt: new Date(due.getTime() + 13 * 3600000), maxScore: p.max ?? null,
          hideTotalFromStudents: !c.isDP && p.type === "SUMMATIVE", isSummativeDate: p.type === "SUMMATIVE", createdById: teacherUserId,
          criteria: { create: crit.filter((x) => p.crits.includes(x.code)).map((x) => ({ criterionId: x.id, maxLevel: 8 })) },
          targets: { create: { groupId: c.hr.id } },
        },
      });
      aCount++;
      await db.unitItem.create({ data: { unitId: units[p.unit].id, type: p.type === "SUMMATIVE" ? "SUMMATIVE_ASSESSMENT" : "FORMATIVE_ASSESSMENT", title: a.title, assignmentId: a.id } });
      if (p.state === "open") continue;
      for (const s of c.hr.students) {
        const r = rnd();
        const subStatus = r < 0.03 ? "MISSED_VALID" : r < 0.045 && p.type === "SUMMATIVE" ? "MISSED_INVALID" : r < 0.1 ? "LATE" : "SUBMITTED";
        await db.submission.create({ data: { assignmentId: a.id, studentId: s.id, status: subStatus, submittedAt: subStatus.startsWith("MISSED") ? null : due, makeupUntil: subStatus === "MISSED_VALID" ? new Date(due.getTime() + 7 * 86400000) : null } });
        if (subStatus.startsWith("MISSED")) continue;
        const status = p.state === "shared" ? "SHARED" : "EVALUATED";
        const level = () => clamp(Math.round(s.ability + (rnd() - 0.5) * 2.4 + (p.period === "T2" ? 0.3 : 0)), 0, 8);
        const score = p.max ? clamp(Math.round(p.max * clamp((s.ability / 8) + (rnd() - 0.5) * 0.25, 0.05, 1)), 0, p.max) : null;
        await db.evaluation.create({
          data: {
            assignmentId: a.id, studentId: s.id, status, score, evaluatedById: teacherUserId, evaluatedAt: due, sharedAt: status === "SHARED" ? new Date(due.getTime() + 3 * 86400000) : null,
            comment: rnd() < 0.6 ? { text: pick(comments) } : Prisma.JsonNull,
            criteria: { create: crit.filter((x) => p.crits.includes(x.code)).map((x) => ({ criterionId: x.id, level: level() })) },
          },
        });
      }
    }
  }

  // ---------- расчёт итогов ----------
  console.log(`Задания: ${aCount}. Пересчёт итогов…`);
  for (const c of courses) await recalcCourse(db, c.id);
  // T1 опубликован
  for (const prog of ["MYP", "DP"]) await db.periodGrade.updateMany({ where: { periodId: periods[prog].T1 }, data: { published: true } });
  // пример ручного переопределения с аудитом
  const coordUser = await db.user.findFirstOrThrow({ where: { email: "myp.coord@demo.school" } });
  const somePg = await db.periodGrade.findFirst({ where: { periodId: periods.MYP.T1, grade7: 4 }, include: { student: { include: { user: true } }, course: true } });
  if (somePg) {
    await db.periodGrade.update({ where: { id: somePg.id }, data: { gradeOverride7: 5, gradeOverride5: 4, overriddenById: coordUser.id, overriddenAt: new Date("2026-10-28T09:00:00Z") } });
    await db.auditLog.create({ data: { schoolId: school.id, actorId: coordUser.id, action: "GRADE_OVERRIDE", entityType: "PeriodGrade", entityId: somePg.id, meta: { from: 4, to: 5, reason: "Решение педсовета по итогам пересдачи", student: `${somePg.student.user.lastName} ${somePg.student.user.firstName}`, course: somePg.course.name } } });
    await recalcCourse(db, somePg.courseId);
  }
  await db.auditLog.create({ data: { schoolId: school.id, actorId: coordUser.id, action: "PERIOD_LOCK", entityType: "GradingPeriod", entityId: periods.MYP.T1, meta: { period: "T1", locked: true } } });

  // уведомления родителям/ученикам о T1
  const guardianLinks = await db.studentGuardian.findMany({ include: { guardian: true, student: true } });
  await db.notification.createMany({
    data: [
      ...guardianLinks.map((g) => ({ recipientId: g.guardian.userId, trigger: "PERIOD_PUBLISHED", title: "Опубликованы итоги Term 1", entityType: "GradingPeriod" })),
      ...(await db.studentProfile.findMany()).map((s) => ({ recipientId: s.userId, trigger: "PERIOD_PUBLISHED", title: "Опубликованы итоги Term 1", entityType: "GradingPeriod" })),
    ],
  });
  await db.calendarEvent.createMany({ data: holidays.map(([a, b, title]) => ({ schoolId: school.id, academicYearId: year.id, title, tag: "HOLIDAY", startsAt: D(a), endsAt: D(b), allDay: true })) });

  const counts = {
    users: await db.user.count(), students: await db.studentProfile.count(), courses: await db.course.count(),
    assignments: await db.assignment.count(), evaluations: await db.evaluation.count(), attendance: await db.attendanceRecord.count(), periodGrades: await db.periodGrade.count(),
  };
  console.log("Готово:", counts);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
