import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { canManageCourse, canEditGrades } from "@/lib/access";
import { PageTitle, Card, Grade7, Grade5, Level, Badge, Notice, Tabs } from "@/components/ui";
import { recalcAction, publishPeriod } from "@/app/actions/grading";
import { fmtDate } from "@/lib/dates";

export default async function GradebookPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ period?: string; recalc?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser();
  const { t, tj, locale } = await getT();
  const course = await db.course.findUnique({
    where: { id },
    include: {
      subject: { include: { criteria: { orderBy: { code: "asc" } } } }, programme: true,
      staff: { include: { staff: { include: { user: true } } } },
      enrollments: { where: { status: "ACTIVE" }, include: { student: { include: { user: true } } } },
    },
  });
  if (!course) notFound();
  if (!(await canManageCourse(user, id))) return <Notice tone="red">{t("accessDenied")}</Notice>;

  const periods = await db.gradingPeriod.findMany({ where: { academicYearId: course.academicYearId, programmeId: course.programmeId }, include: { contributesTo: { include: { child: true } } }, orderBy: { sortOrder: "asc" } });
  const today = new Date();
  const defaultPeriod = periods.find((p) => p.kind === "REPORTING" && p.startDate <= today && p.endDate >= today) ?? periods[0];
  const period = periods.find((p) => p.abbreviation === sp.period) ?? defaultPeriod;
  const canEdit = await canEditGrades(user, id, period.id);
  const students = course.enrollments.map((e) => e.student).sort((a, b) => a.user.lastName.localeCompare(b.user.lastName, "ru"));
  const criteria = course.subject.criteria;
  const isCriteria = criteria.length > 0;

  const assignments = period.kind === "REPORTING"
    ? await db.assignment.findMany({
        where: { courseId: id, periodId: period.id, deletedAt: null },
        include: { criteria: { include: { criterion: true } }, evaluations: { include: { criteria: true } }, submissions: true },
        orderBy: { dueAt: "asc" },
      })
    : [];
  const childIds = period.contributesTo.map((c) => c.childId);
  const pgs = await db.periodGrade.findMany({ where: { courseId: id, periodId: { in: [period.id, ...childIds] } }, include: { criterionGrades: true } });
  const pgOf = (sid: string, pid: string) => pgs.find((p) => p.studentId === sid && p.periodId === pid);
  const current = pgs.filter((p) => p.periodId === period.id);
  const publishedCount = current.filter((p) => p.published).length;
  const dist = [1, 2, 3, 4, 5, 6, 7].map((g) => current.filter((p) => (p.gradeOverride7 ?? p.grade7) === g).length);
  const maxDist = Math.max(1, ...dist);

  return (
    <>
      <PageTitle
        back={{ href: "/courses", label: t("courses") }}
        title={course.name}
        subtitle={`${tj(course.subject.name)}${course.level !== "NONE" ? " " + course.level : ""} · ${course.programme.code} · ${course.staff.map((s) => `${s.staff.user.lastName} ${s.staff.user.firstName}`).join(", ")}`}
        actions={canEdit && period.kind === "REPORTING" ? <Link className="btn btn-primary" href={`/courses/${id}/new?period=${period.abbreviation}`}>+ {t("newAssignment")}</Link> : null}
      />
      <Tabs items={periods.map((p) => ({ href: `/courses/${id}?period=${p.abbreviation}`, label: <>{p.abbreviation}{p.locked ? " 🔒" : ""}</>, active: p.id === period.id }))} />
      {period.locked && <Notice tone="amber">🔒 {t("periodLockedMsg")}</Notice>}
      {sp.recalc && <Notice tone="green">✓ {t("recalc")}</Notice>}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="text-sm text-slate-500">{period.name} · {fmtDate(period.startDate, locale)} – {fmtDate(period.endDate, locale)}</div>
        <Badge tone={publishedCount === current.length && current.length > 0 ? "green" : "slate"}>{publishedCount ? `${t("published")}: ${publishedCount}/${current.length}` : t("notPublished")}</Badge>
        <div className="ml-auto flex flex-wrap gap-2">
          <form action={recalcAction}><input type="hidden" name="courseId" value={id} /><input type="hidden" name="period" value={period.abbreviation} /><button className="btn btn-sm">↻ {t("recalc")}</button></form>
          {canEdit && (
            <form action={publishPeriod}>
              <input type="hidden" name="courseId" value={id} /><input type="hidden" name="periodId" value={period.id} />
              <input type="hidden" name="publish" value={publishedCount === current.length && current.length > 0 ? "0" : "1"} />
              <button className={`btn btn-sm ${publishedCount === current.length && current.length > 0 ? "" : "btn-primary"}`}>
                {publishedCount === current.length && current.length > 0 ? t("unpublishPeriod") : t("publishPeriod")}
              </button>
            </form>
          )}
        </div>
      </div>

      <Card className="mb-6">
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-slate-50">{t("student")}</th>
                {assignments.map((a) => (
                  <th key={a.id} className="min-w-[5.5rem] text-center">
                    <Link href={`/assignments/${a.id}`} className="block hover:text-brand-700" title={a.title}>
                      <div className="mx-auto max-w-[7rem] truncate">{a.title.split(":")[0]}</div>
                      <div className="font-normal text-slate-400">{fmtDate(a.dueAt, locale)} · {a.type === "SUMMATIVE" ? "SA" : "FA"}{a.criteria.length ? " " + a.criteria.map((c) => c.criterion.code).join("") : a.maxScore ? ` /${Number(a.maxScore)}` : ""}</div>
                    </Link>
                  </th>
                ))}
                {period.kind === "CUMULATIVE" && period.contributesTo.map((c) => <th key={c.id} className="text-center">{c.child.abbreviation}<div className="font-normal text-slate-400">×{Number(c.weight)}</div></th>)}
                {period.kind === "REPORTING" && isCriteria && criteria.map((c) => <th key={c.id} className="bg-blue-50 text-center" title={tj(c.name)}>{c.code}</th>)}
                {period.kind === "REPORTING" && isCriteria && <th className="bg-blue-50 text-center">{t("sum")}</th>}
                {period.kind === "REPORTING" && !isCriteria && <th className="bg-blue-50 text-center">%</th>}
                <th className="bg-blue-50 text-center">{t("grade7")}</th>
                <th className="bg-blue-50 text-center">{t("grade5")}</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const pg = pgOf(s.id, period.id);
                return (
                  <tr key={s.id}>
                    <td className="sticky left-0 z-10 whitespace-nowrap bg-white font-medium">
                      <Link href={`/students/${s.id}`} className="hover:underline">{s.user.lastName} {s.user.firstName}</Link>
                    </td>
                    {assignments.map((a) => {
                      const ev = a.evaluations.find((e) => e.studentId === s.id);
                      const sub = a.submissions.find((x) => x.studentId === s.id);
                      const missed = sub?.status === "MISSED_INVALID" ? "0*" : sub?.status === "MISSED_VALID" ? "EX" : null;
                      return (
                        <td key={a.id} className={`text-center ${a.type === "FORMATIVE" ? "bg-slate-50/70" : ""}`}>
                          {missed ? <span className={missed === "EX" ? "text-blue-600" : "text-red-600"} title={t(`sub_${sub!.status}` as never)}>{missed}</span>
                            : ev && ev.status !== "NOT_EVALUATED" ? (
                              <span className={ev.status === "SHARED" ? "" : "opacity-60"} title={t(`ev_${ev.status}` as never)}>
                                {a.criteria.length ? a.criteria.map((c) => <span key={c.criterionId} className="mx-0.5"><Level value={ev.criteria.find((x) => x.criterionId === c.criterionId)?.level} /></span>)
                                  : ev.score != null ? <span className="tabular-nums">{Number(ev.score)}</span> : "—"}
                              </span>
                            ) : <span className="text-slate-300">·</span>}
                        </td>
                      );
                    })}
                    {period.kind === "CUMULATIVE" && period.contributesTo.map((c) => {
                      const cp = pgOf(s.id, c.childId);
                      return <td key={c.id} className="text-center"><Grade7 value={cp?.gradeOverride7 ?? cp?.grade7} overridden={cp?.gradeOverride7 != null} muted /></td>;
                    })}
                    {period.kind === "REPORTING" && isCriteria && criteria.map((c) => {
                      const cg = pg?.criterionGrades.find((x) => x.criterionId === c.id);
                      return <td key={c.id} className="bg-blue-50/40 text-center"><Level value={cg?.overrideLevel ?? cg?.level} /></td>;
                    })}
                    {period.kind === "REPORTING" && isCriteria && <td className="bg-blue-50/40 text-center tabular-nums">{pg?.criteriaSum ?? "—"}{pg?.criteriaCount != null && pg.criteriaCount < criteria.length && pg.criteriaCount > 0 && <span className="text-xs text-slate-400">/{pg.criteriaCount * 8}</span>}</td>}
                    {period.kind === "REPORTING" && !isCriteria && <td className="bg-blue-50/40 text-center tabular-nums">{pg?.overallPct != null ? Number(pg.overallPct).toFixed(1) : "—"}</td>}
                    <td className="bg-blue-50/40 text-center">
                      {pg ? (
                        <Link href={`/courses/${id}/grades/${pg.id}`} title={t("override")} className="inline-flex items-center gap-1">
                          <Grade7 value={pg.gradeOverride7 ?? pg.grade7} overridden={pg.gradeOverride7 != null} />
                          {pg.published && <span className="text-[10px] text-green-600">●</span>}
                        </Link>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="bg-blue-50/40 text-center"><Grade5 value={pg?.gradeOverride5 ?? pg?.grade5} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
          <span>SA — {t("type_SUMMATIVE")}, FA — {t("type_FORMATIVE")} ({t("formativeNotInFinal")})</span>
          <span><span className="text-red-600">0*</span> — {t("sub_MISSED_INVALID")}</span>
          <span><span className="text-blue-600">EX</span> — {t("sub_MISSED_VALID")}</span>
          <span><span className="opacity-60">5</span> — {t("ev_EVALUATED")}, {t("notPublished").toLowerCase()}</span>
          <span><span className="text-green-600">●</span> {t("published")}</span>
          <span><span className="rounded ring-2 ring-violet-400">&nbsp;&nbsp;&nbsp;</span> {t("overridden")}</span>
        </div>
      </Card>

      <Card title={`${t("period")} ${period.abbreviation}: 1–7`}>
        <div className="flex h-28 items-end gap-3">
          {dist.map((n, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div className="text-xs tabular-nums text-slate-500">{n}</div>
              <div className="w-full rounded-t bg-brand-500" style={{ height: `${(n / maxDist) * 80}px`, minHeight: n ? 2 : 0 }} />
              <div className="text-xs font-medium">{i + 1}</div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
