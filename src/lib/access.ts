import { db } from "./db";
import type { CurrentUser } from "./auth";

/**
 * Серверные политики доступа (RBAC с областью программы).
 * Каждая страница и каждое серверное действие проверяет права здесь, а не только в UI.
 */
export const hasRole = (u: CurrentUser, role: string) => u.roles.some((r) => r.role === role);
export const isSchoolAdmin = (u: CurrentUser) => hasRole(u, "SCHOOL_ADMIN") || hasRole(u, "SUPER_ADMIN") || hasRole(u, "PRINCIPAL");
export const isCoordinatorOf = (u: CurrentUser, programmeId: string) =>
  u.roles.some((r) => r.role === "COORDINATOR" && r.programmeId === programmeId);
export const isDeputyOf = (u: CurrentUser, programmeId: string) =>
  u.roles.some((r) => r.role === "DEPUTY_HEAD" && (r.programmeId === null || r.programmeId === programmeId));
/** Сотрудник с правом видеть всю программу (админ, координатор, завуч). */
export const isProgrammeStaff = (u: CurrentUser, programmeId: string) =>
  isSchoolAdmin(u) || isCoordinatorOf(u, programmeId) || isDeputyOf(u, programmeId);
export const canAdmin = (u: CurrentUser) =>
  isSchoolAdmin(u) || u.roles.some((r) => r.role === "COORDINATOR" || r.role === "DEPUTY_HEAD");

export function guardianChildIds(u: CurrentUser): string[] {
  return u.guardianProfile?.students.map((s) => s.studentId) ?? [];
}

export async function teachesCourse(u: CurrentUser, courseId: string) {
  if (!u.staffProfile) return false;
  const cs = await db.courseStaff.findUnique({ where: { courseId_staffId: { courseId, staffId: u.staffProfile.id } } });
  return !!cs;
}

/** Может ли пользователь видеть курс целиком (журнал, всех учеников). */
export async function canManageCourse(u: CurrentUser, courseId: string) {
  const course = await db.course.findUnique({ where: { id: courseId }, select: { programmeId: true } });
  if (!course) return false;
  return isProgrammeStaff(u, course.programmeId) || (await teachesCourse(u, courseId));
}

/** Может ли менять оценки за период: учитель курса при открытом периоде; координатор программы — всегда. */
export async function canEditGrades(u: CurrentUser, courseId: string, periodId: string | null) {
  const course = await db.course.findUnique({ where: { id: courseId }, select: { programmeId: true } });
  if (!course) return false;
  if (isCoordinatorOf(u, course.programmeId) || isSchoolAdmin(u)) return true;
  if (!(await teachesCourse(u, courseId))) return false;
  if (!periodId) return true;
  const p = await db.gradingPeriod.findUnique({ where: { id: periodId }, select: { locked: true } });
  return !p?.locked;
}

/** Может ли видеть данные конкретного ученика. Родитель — только своих подтверждённых детей. Один запрос к БД вместо цикла. */
export async function canViewStudent(u: CurrentUser, studentId: string) {
  if (u.studentProfile?.id === studentId) return true;
  if (guardianChildIds(u).includes(studentId)) return true;
  if (isSchoolAdmin(u)) return true;
  if (!u.staffProfile) return false;
  const programmeIds = u.roles
    .filter((r) => r.role === "COORDINATOR" || r.role === "DEPUTY_HEAD")
    .map((r) => r.programmeId);
  const allProgrammes = u.roles.some((r) => r.role === "DEPUTY_HEAD" && r.programmeId === null);
  const staffId = u.staffProfile.id;
  const hit = await db.studentProfile.findFirst({
    where: {
      id: studentId,
      user: { schoolId: u.schoolId },
      OR: [
        { advisors: { some: { staffId } } },
        { enrollments: { some: { course: { staff: { some: { staffId } } } } } },
        ...(allProgrammes ? [{ enrollments: { some: {} } }] : []),
        ...(programmeIds.filter(Boolean).length ? [{ enrollments: { some: { course: { programmeId: { in: programmeIds.filter(Boolean) as string[] } } } } }] : []),
      ],
    },
    select: { id: true },
  });
  return !!hit;
}
