/**
 * Интеграционные тесты прав доступа на seed-данных (нужна БД: npm run db:reset).
 * Проверяют серверные политики, а не UI.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { loadUser, type CurrentUser } from "@/lib/auth";
import { canViewStudent, canManageCourse, canEditGrades, canAdmin } from "@/lib/access";

const byEmail = async (email: string) => (await loadUser((await db.user.findFirstOrThrow({ where: { email } })).id))!;
let parent: CurrentUser, mathTeacher: CurrentUser, designTeacher: CurrentUser, mypCoord: CurrentUser, dpCoord: CurrentUser, student: CurrentUser;
let ownChild: string, otherStudent: string, math7A: string, design7A: string, dpPhys: string, T1myp: string, T2myp: string, T1dp: string;

beforeAll(async () => {
  const link = await db.studentGuardian.findFirstOrThrow({ include: { guardian: { include: { user: true } } } });
  parent = (await loadUser(link.guardian.userId))!;
  ownChild = link.studentId;
  otherStudent = (await db.studentProfile.findFirstOrThrow({ where: { guardians: { none: { guardianId: link.guardianId } } } })).id;
  mathTeacher = await byEmail("math@demo.school");
  designTeacher = await byEmail("design@demo.school");
  mypCoord = await byEmail("myp.coord@demo.school");
  dpCoord = await byEmail("dp.coord@demo.school");
  student = (await loadUser((await db.studentProfile.findFirstOrThrow({ where: { id: ownChild } })).userId))!;
  math7A = (await db.course.findFirstOrThrow({ where: { name: "7A Mathematics" } })).id;
  design7A = (await db.course.findFirstOrThrow({ where: { name: "7A Design" } })).id;
  dpPhys = (await db.course.findFirstOrThrow({ where: { name: { startsWith: "DP1 Physics" } } })).id;
  T1myp = (await db.gradingPeriod.findFirstOrThrow({ where: { abbreviation: "T1", programme: { code: "MYP" } } })).id;
  T2myp = (await db.gradingPeriod.findFirstOrThrow({ where: { abbreviation: "T2", programme: { code: "MYP" } } })).id;
  T1dp = (await db.gradingPeriod.findFirstOrThrow({ where: { abbreviation: "T1", programme: { code: "DP" } } })).id;
});
afterAll(() => db.$disconnect());

describe("родитель", () => {
  it("видит своего ребёнка", async () => expect(await canViewStudent(parent, ownChild)).toBe(true));
  it("не видит чужого ребёнка", async () => expect(await canViewStudent(parent, otherStudent)).toBe(false));
  it("не управляет курсами и не админ", async () => {
    expect(await canManageCourse(parent, math7A)).toBe(false);
    expect(canAdmin(parent)).toBe(false);
  });
});

describe("ученик", () => {
  it("видит только себя", async () => {
    expect(await canViewStudent(student, ownChild)).toBe(true);
    expect(await canViewStudent(student, otherStudent)).toBe(false);
  });
  it("не может ставить оценки", async () => expect(await canEditGrades(student, math7A, T2myp)).toBe(false));
});

describe("учитель", () => {
  it("управляет своим курсом, но не чужим", async () => {
    expect(await canManageCourse(mathTeacher, math7A)).toBe(true);
    expect(await canManageCourse(mathTeacher, design7A)).toBe(false);
    expect(await canManageCourse(designTeacher, math7A)).toBe(false);
  });
  it("не меняет оценки в заблокированном периоде", async () => {
    expect(await canEditGrades(mathTeacher, math7A, T1myp)).toBe(false);
    expect(await canEditGrades(mathTeacher, math7A, T2myp)).toBe(true);
  });
  it("не имеет доступа к админке", () => expect(canAdmin(mathTeacher)).toBe(false));
});

describe("координаторы (права по программам)", () => {
  it("координатор MYP меняет заблокированный MYP-период", async () => expect(await canEditGrades(mypCoord, math7A, T1myp)).toBe(true));
  it("координатор MYP не правит DP", async () => expect(await canEditGrades(mypCoord, dpPhys, T1dp)).toBe(false));
  it("координатор DP правит DP, но не MYP", async () => {
    expect(await canEditGrades(dpCoord, dpPhys, T1dp)).toBe(true);
    expect(await canEditGrades(dpCoord, math7A, T2myp)).toBe(false);
  });
});
