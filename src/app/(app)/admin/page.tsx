import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { canAdmin, isCoordinatorOf, isSchoolAdmin } from "@/lib/access";
import { PageTitle, Card, Stat, Badge, Notice } from "@/components/ui";
import { toggleLock } from "@/app/actions/grading";
import { fmtDate, todayIso, isoToDate } from "@/lib/dates";

export default async function AdminPage() {
  const user = await requireUser();
  const { t, tj, locale } = await getT();
  if (!canAdmin(user)) return <Notice tone="red">{t("accessDenied")}</Notice>;
  const today = todayIso();
  const [students, teachers, courses, assignments, guardians] = await Promise.all([
    db.studentProfile.count(), db.staffProfile.count({ where: { user: { roles: { some: { role: "TEACHER" } } } } }), db.course.count({ where: { deletedAt: null } }),
    db.assignment.count({ where: { deletedAt: null } }), db.guardianProfile.count(),
  ]);
  const day = await db.scheduleDay.findFirst({ where: { date: isoToDate(today) } });
  const lessonsToday = day?.dayIndex ? await db.timetableEntry.count({ where: { dayIndex: day.dayIndex } }) : 0;
  const markedToday = await db.attendanceSession.count({ where: { date: isoToDate(today), records: { some: {} } } });
  const programmes = await db.programme.findMany({ include: { periods: { where: { academicYear: { isCurrent: true } }, orderBy: { sortOrder: "asc" } } }, orderBy: { code: "desc" } });
  const pubStats = await db.periodGrade.groupBy({ by: ["periodId", "published"], _count: true });

  // Ученики с итогом < 4 в последнем открытом/текущем периоде (порог из PerformanceThreshold)
  const now = new Date();
  const risk = [];
  for (const p of programmes) {
    const threshold = await db.performanceThreshold.findUnique({ where: { programmeId_metric: { programmeId: p.id, metric: "IB_GRADE" } } });
    // последний завершённый reporting-период (итоги текущего ещё неполные)
    const cur = p.periods.filter((x) => x.kind === "REPORTING" && x.endDate < now).at(-1) ?? p.periods.find((x) => x.kind === "REPORTING");
    if (!cur || !threshold) continue;
    const low = await db.periodGrade.findMany({
      where: { periodId: cur.id, OR: [{ gradeOverride7: { lt: Number(threshold.value) } }, { gradeOverride7: null, grade7: { lt: Number(threshold.value) } }] },
      include: { student: { include: { user: true } }, course: true }, take: 50,
    });
    risk.push({ programme: p, period: cur, threshold: Number(threshold.value), low });
  }

  return (
    <>
      <PageTitle title={t("overview")} subtitle={fmtDate(today, locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        actions={<a href="/api/export/edupage?period=FY" className="btn">⬇ {t("exportEdupage")}</a>} />
      <div className="mb-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label={t("students")} value={students} />
        <Stat label={t("role_GUARDIAN")} value={guardians} />
        <Stat label={t("role_TEACHER")} value={teachers} />
        <Stat label={t("courses")} value={courses} />
        <Stat label={t("assignmentsCount")} value={assignments} />
        <Stat label={`${t("navAttendance")} · ${t("navToday").toLowerCase()}`} value={day?.isNonWorking ? "—" : `${markedToday}/${lessonsToday}`} hint={day?.isNonWorking ? t("nonWorkingDay") : t("marked").toLowerCase()} tone={lessonsToday && markedToday < lessonsToday ? "amber" : "green"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {programmes.map((p) => {
          const canLock = isSchoolAdmin(user) || isCoordinatorOf(user, p.id);
          return (
            <Card key={p.id} title={<>{t("periods")} · {tj(p.name)}</>}>
              <table className="tbl">
                <thead><tr><th>{t("period")}</th><th>{t("date")}</th><th>{t("published")}</th><th>{t("status")}</th><th></th></tr></thead>
                <tbody>
                  {p.periods.map((per) => {
                    const pub = pubStats.find((s) => s.periodId === per.id && s.published)?._count ?? 0;
                    const all = pubStats.filter((s) => s.periodId === per.id).reduce((a, s) => a + s._count, 0);
                    return (
                      <tr key={per.id}>
                        <td><b>{per.abbreviation}</b> <span className="text-slate-500">{per.name}</span></td>
                        <td className="whitespace-nowrap text-xs text-slate-500">{fmtDate(per.startDate, locale)} – {fmtDate(per.endDate, locale)}</td>
                        <td className="tabular-nums text-xs">{all ? `${pub}/${all}` : "—"}</td>
                        <td>{per.locked ? <Badge tone="amber">🔒 {t("locked")}</Badge> : <Badge tone="green">{t("unlocked")}</Badge>}</td>
                        <td className="text-right">
                          {canLock && <form action={toggleLock}><input type="hidden" name="periodId" value={per.id} /><button className="btn btn-sm">{per.locked ? t("unlock") : t("lock")}</button></form>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {risk.map((r) => (
          <Card key={r.programme.id} title={<>{r.programme.code} · {r.period.abbreviation}: IB &lt; {r.threshold} <Badge tone="red">{r.low.length}</Badge></>}>
            {r.low.length === 0 ? <div className="text-sm text-slate-500">{t("noData")}</div> : (
              <ul className="space-y-1 text-sm">
                {r.low.map((pg) => (
                  <li key={pg.id} className="flex items-center gap-2">
                    <Link href={`/students/${pg.studentId}`} className="link">{pg.student.user.lastName} {pg.student.user.firstName}</Link>
                    <span className="text-slate-500">{pg.course.name}</span>
                    <span className="ml-auto font-semibold text-red-700">{pg.gradeOverride7 ?? pg.grade7}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}
