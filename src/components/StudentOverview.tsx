import Link from "next/link";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { Card, Grade7, Grade5, Level, Stat, Badge } from "@/components/ui";
import { fmtDate } from "@/lib/dates";

/**
 * Сводка ученика: итоги по всем предметам и периодам, последние оценки, посещаемость.
 * familyView=true — показываются только опубликованные данные (вид ученика/родителя).
 */
export async function StudentOverview({ studentId, familyView }: { studentId: string; familyView: boolean }) {
  const { t, tj, locale } = await getT();
  const student = await db.studentProfile.findUniqueOrThrow({
    where: { id: studentId },
    include: { user: true, groupMembers: { include: { group: true } }, advisors: { include: { staff: { include: { user: true } } } } },
  });
  const enrollments = await db.courseEnrollment.findMany({
    where: { studentId, status: "ACTIVE", course: { deletedAt: null } },
    include: { course: { include: { subject: { include: { subjectGroup: true } }, programme: true, staff: { where: { isPrimary: true }, include: { staff: { include: { user: true } } } } } } },
  });
  const programmeId = enrollments[0]?.course.programmeId;
  const periods = programmeId ? await db.gradingPeriod.findMany({ where: { programmeId, academicYear: { isCurrent: true } }, orderBy: { sortOrder: "asc" } }) : [];
  const pgs = await db.periodGrade.findMany({ where: { studentId, ...(familyView ? { published: true } : {}) } });
  const evals = await db.evaluation.findMany({
    where: { studentId, status: familyView ? "SHARED" : { in: ["EVALUATED", "SHARED"] }, assignment: { deletedAt: null } },
    include: { assignment: { include: { course: true, criteria: { include: { criterion: true } } } }, criteria: true },
    orderBy: { assignment: { dueAt: "desc" } },
    take: 12,
  });
  const upcoming = await db.assignment.findMany({
    where: { deletedAt: null, status: "PUBLISHED", dueAt: { gte: new Date() }, course: { enrollments: { some: { studentId } } } },
    include: { course: true }, orderBy: { dueAt: "asc" }, take: 6,
  });
  const att = await db.attendanceRecord.groupBy({ by: ["codeId"], where: { studentId }, _count: true });
  const codes = await db.attendanceCode.findMany();
  const total = att.reduce((a, r) => a + r._count, 0);
  const presentN = att.filter((r) => codes.find((c) => c.id === r.codeId)?.countsAsPresent).reduce((a, r) => a + r._count, 0);
  const n = (kind: string) => att.filter((r) => codes.find((c) => c.id === r.codeId)?.kind === kind).reduce((a, r) => a + r._count, 0);
  const pct = total ? (presentN / total) * 100 : null;
  const absences = await db.attendanceRecord.findMany({
    where: { studentId, code: { kind: { in: ["ABSENT", "EXCUSED"] } } },
    include: { code: true, session: { include: { entry: { include: { course: true, slot: true } } } } },
    orderBy: { session: { date: "desc" } }, take: 6,
  });

  const courses = enrollments.map((e) => e.course).sort((a, b) => (a.subject.subjectGroup?.sortOrder ?? 0) - (b.subject.subjectGroup?.sortOrder ?? 0));
  const cls = student.groupMembers.map((g) => g.group.name).join(", ");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{student.user.lastName} {student.user.firstName}</h1>
          <div className="text-sm text-slate-500">{t("homeroom")} {cls} · {courses[0]?.programme.code} · {t("role_HOMEROOM_ADVISOR")}: {student.advisors.map((a) => `${a.staff.user.lastName} ${a.staff.user.firstName}`).join(", ")}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label={t("attendanceRate")} value={pct == null ? "—" : `${pct.toFixed(1)}%`} tone={pct == null ? "slate" : pct >= 95 ? "green" : pct >= 90 ? "amber" : "red"} hint={`${total} ${t("lessonsOf")}`} />
        <Stat label={t("absences")} value={n("ABSENT") + n("EXCUSED")} hint={`${n("EXCUSED")} — ${t("sub_MISSED_VALID").toLowerCase()}`} />
        <Stat label={t("lates")} value={n("LATE")} />
        <Stat label={t("courses")} value={courses.length} />
      </div>

      <Card title={`${t("finalGrades")} · IB 1–7 / 5`}>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>{t("course")}</th>
                {periods.map((p) => <th key={p.id} className={`text-center ${p.kind === "CUMULATIVE" ? "bg-blue-50" : ""}`}>{p.abbreviation}</th>)}
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="font-medium">{tj(c.subject.name)}{c.level !== "NONE" ? ` ${c.level}` : ""}</div>
                    <div className="text-xs text-slate-500">{c.staff.map((s) => `${s.staff.user.lastName} ${s.staff.user.firstName[0]}.`).join(", ")}</div>
                  </td>
                  {periods.map((p) => {
                    const pg = pgs.find((x) => x.courseId === c.id && x.periodId === p.id);
                    const g7 = pg?.gradeOverride7 ?? pg?.grade7;
                    const g5 = pg?.gradeOverride5 ?? pg?.grade5;
                    return (
                      <td key={p.id} className={`text-center ${p.kind === "CUMULATIVE" ? "bg-blue-50/40" : ""}`}>
                        {g7 != null ? <div className="flex items-center justify-center gap-1.5"><Grade7 value={g7} overridden={!familyView && pg?.gradeOverride7 != null} /><span className="text-slate-300">/</span><Grade5 value={g5} />{!familyView && pg && !pg.published && <span className="text-[10px] text-slate-400" title={t("notPublished")}>○</span>}</div> : <span className="text-slate-300">—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title={t("recentFeedback")} className="lg:col-span-2">
          {evals.length === 0 ? <div className="text-sm text-slate-500">{t("noData")}</div> : (
            <ul className="divide-y divide-slate-100">
              {evals.map((e) => {
                const comment = e.comment && typeof e.comment === "object" ? (e.comment as { text?: string }).text : null;
                const a = e.assignment;
                return (
                  <li key={e.id} className="py-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{a.title}</span>
                      <Badge tone={a.type === "SUMMATIVE" ? "violet" : "slate"}>{t(`type_${a.type}` as never)}</Badge>
                      <span className="text-xs text-slate-500">{a.course.name} · {fmtDate(a.dueAt, locale)}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-sm">
                      {a.criteria.map((c) => (
                        <span key={c.criterionId} title={tj(c.criterion.name)}>{c.criterion.code}: <Level value={e.criteria.find((x) => x.criterionId === c.criterionId)?.level} /><span className="text-slate-400">/{c.maxLevel}</span></span>
                      ))}
                      {a.maxScore && e.score != null && !(familyView && a.hideTotalFromStudents) && <span>{t("score")}: <b className="tabular-nums">{Number(e.score)}</b>/{Number(a.maxScore)}</span>}
                    </div>
                    {comment && <div className="mt-1 text-sm text-slate-600">💬 {comment}</div>}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
        <div className="space-y-6">
          <Card title={t("upcoming")}>
            {upcoming.length === 0 ? <div className="text-sm text-slate-500">{t("noAssignments")}</div> : (
              <ul className="space-y-2 text-sm">
                {upcoming.map((a) => (
                  <li key={a.id}><div className="font-medium">{a.title}</div><div className="text-xs text-slate-500">{a.course.name} · {fmtDate(a.dueAt, locale, { weekday: "short", day: "numeric", month: "short" })}</div></li>
                ))}
              </ul>
            )}
          </Card>
          <Card title={t("absences")}>
            {absences.length === 0 ? <div className="text-sm text-slate-500">{t("noData")}</div> : (
              <ul className="space-y-1.5 text-sm">
                {absences.map((r) => (
                  <li key={r.sessionId} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: r.code.color ?? "#999" }} />
                    <span className="tabular-nums text-slate-500">{fmtDate(r.session.date, locale)}</span>
                    <span>{r.session.entry.course.name}</span>
                    <span className="ml-auto text-xs text-slate-500">{tj(r.code.name)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
      {!familyView && <div className="text-xs text-slate-500"><Link className="link" href="/courses">← {t("courses")}</Link></div>}
    </div>
  );
}
