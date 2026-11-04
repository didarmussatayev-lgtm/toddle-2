import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { PageTitle, Card, Badge, Notice } from "@/components/ui";
import { todayIso, isIso, isoToDate, addDays, fmtDate } from "@/lib/dates";
import { canAdmin } from "@/lib/access";

export default async function TodayPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const user = await requireUser();
  const { t, tj, locale } = await getT();
  const sp = await searchParams;
  const date = isIso(sp.date) ? sp.date : todayIso();
  const day = await db.scheduleDay.findFirst({ where: { date: isoToDate(date) } });
  const staffId = user.staffProfile?.id;

  const entries = day?.dayIndex && staffId
    ? await db.timetableEntry.findMany({
        where: { dayIndex: day.dayIndex, validFrom: { lte: isoToDate(date) }, validTo: { gte: isoToDate(date) }, course: { staff: { some: { staffId } }, deletedAt: null } },
        include: { slot: { include: { period: true } }, course: { include: { subject: true, _count: { select: { enrollments: true } } } }, sessions: { where: { date: isoToDate(date) }, include: { _count: { select: { records: true } } } } },
        orderBy: { slot: { startTime: "asc" } },
      })
    : [];

  const upcoming = staffId
    ? await db.assignment.findMany({
        where: { deletedAt: null, course: { staff: { some: { staffId } } }, dueAt: { gte: isoToDate(addDays(date, -14)), lt: isoToDate(addDays(date, 1)) }, type: { in: ["SUMMATIVE", "FORMATIVE"] } },
        include: { course: true, _count: { select: { evaluations: { where: { status: { in: ["EVALUATED", "SHARED"] } } } } } },
        orderBy: { dueAt: "desc" },
        take: 8,
      })
    : [];

  const weekday = isoToDate(date).getUTCDay();
  const nav = (
    <div className="flex items-center gap-2">
      <Link className="btn" href={`/today?date=${addDays(date, weekday === 1 ? -3 : -1)}`}>{t("prevDay")}</Link>
      <Link className="btn" href="/today">{t("todayBtn")}</Link>
      <Link className="btn" href={`/today?date=${addDays(date, weekday === 5 ? 3 : 1)}`}>{t("nextDay")}</Link>
    </div>
  );

  return (
    <>
      <PageTitle title={t("todayLessons")} subtitle={fmtDate(date, locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} actions={nav} />
      {!staffId && canAdmin(user) && <Notice>{t("noLessons")}</Notice>}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            {day?.isNonWorking ? (
              <div className="py-6 text-center text-slate-500">{t("nonWorkingDay")}{day.label ? `: ${day.label}` : ""}</div>
            ) : entries.length === 0 ? (
              <div className="py-6 text-center text-slate-500">{t("noLessons")}</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {entries.map((e) => {
                  const s = e.sessions[0];
                  const marked = !!s && s._count.records > 0;
                  return (
                    <li key={e.id} className="flex flex-wrap items-center gap-4 py-3">
                      <div className="w-24 shrink-0 tabular-nums">
                        <div className="text-sm font-semibold">{e.slot.startTime}–{e.slot.endTime}</div>
                        <div className="text-xs text-slate-500">{e.slot.period.name}</div>
                      </div>
                      <span className="h-8 w-1 rounded" style={{ background: e.course.color ?? "#94a3b8" }} />
                      <div className="min-w-0 flex-1">
                        <Link href={`/courses/${e.course.id}`} className="font-medium hover:underline">{e.course.name}</Link>
                        <div className="text-xs text-slate-500">{tj(e.course.subject.name)} · {t("room")} {e.room} · {e.course._count.enrollments} {t("students").toLowerCase()}</div>
                      </div>
                      {marked ? <Badge tone="green">✓ {t("marked")}</Badge> : <Badge tone="amber">{t("notMarked")}</Badge>}
                      <Link href={`/attendance/${e.id}/${date}`} className={`btn btn-sm ${marked ? "" : "btn-primary"}`}>{t("markAttendance")}</Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
        <Card title={t("navAssignments")}>
          {upcoming.length === 0 ? <div className="text-sm text-slate-500">{t("noAssignments")}</div> : (
            <ul className="space-y-2.5">
              {upcoming.map((a) => (
                <li key={a.id} className="text-sm">
                  <Link href={`/assignments/${a.id}`} className="font-medium hover:underline">{a.title}</Link>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>{a.course.name}</span>·<span>{fmtDate(a.dueAt, locale)}</span>·
                    <Badge tone={a.type === "SUMMATIVE" ? "violet" : "slate"}>{t(`type_${a.type}` as never)}</Badge>
                    <span>{a._count.evaluations} {t("evaluated")}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
