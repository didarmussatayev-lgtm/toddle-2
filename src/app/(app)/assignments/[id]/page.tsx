import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { canManageCourse, canEditGrades } from "@/lib/access";
import { PageTitle, Card, Badge, Notice } from "@/components/ui";
import { saveEvaluations } from "@/app/actions/grading";
import { fmtDate, dateToIso } from "@/lib/dates";
import { summativeLoad } from "@/lib/workload";

const SUBS = ["SUBMITTED", "LATE", "NOT_SUBMITTED", "MISSED_VALID", "MISSED_INVALID"] as const;

export default async function AssignmentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; created?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser();
  const { t, tj, locale } = await getT();
  const a = await db.assignment.findUnique({
    where: { id },
    include: {
      period: true, category: true,
      criteria: { include: { criterion: true }, orderBy: { criterion: { code: "asc" } } },
      course: { include: { enrollments: { where: { status: "ACTIVE" }, include: { student: { include: { user: true } } } } } },
      evaluations: { include: { criteria: true } }, submissions: true,
    },
  });
  if (!a || a.deletedAt) notFound();
  if (!(await canManageCourse(user, a.courseId))) return <Notice tone="red">{t("accessDenied")}</Notice>;
  const canEdit = await canEditGrades(user, a.courseId, a.periodId);
  const students = a.course.enrollments.map((e) => e.student).sort((x, y) => x.user.lastName.localeCompare(y.user.lastName, "ru"));
  const load = a.type === "SUMMATIVE" && a.dueAt ? await summativeLoad(a.courseId, dateToIso(a.dueAt)) : 0;
  const shared = a.evaluations.filter((e) => e.status === "SHARED").length;
  const evaluated = a.evaluations.filter((e) => e.status === "EVALUATED" || e.status === "SHARED").length;

  return (
    <>
      <PageTitle
        back={{ href: `/courses/${a.courseId}?period=${a.period?.abbreviation ?? ""}`, label: a.course.name }}
        title={a.title}
        subtitle={<span className="flex flex-wrap items-center gap-2">
          <Badge tone={a.type === "SUMMATIVE" ? "violet" : "slate"}>{t(`type_${a.type}` as never)}</Badge>
          <span>{t("dueDate")}: {fmtDate(a.dueAt, locale, { day: "numeric", month: "long" })}</span>
          <span>· {a.period?.name}</span>
          <span>· {evaluated}/{students.length} {t("evaluated")}, {shared} {t("published").toLowerCase()}</span>
          {a.hideTotalFromStudents && <Badge>{t("hiddenTotal")}</Badge>}
        </span>}
      />
      {sp.saved && <Notice tone="green">✓ {t("saved")}</Notice>}
      {load > 3 && <Notice tone="amber">⚠ {t("summativeLimitWarn")} ({load})</Notice>}
      {!canEdit && <Notice tone="amber">🔒 {t("periodLockedMsg")}</Notice>}

      {a.criteria.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2 text-sm">
          {a.criteria.map((c) => <span key={c.criterionId} className="rounded-lg bg-white px-3 py-1.5 shadow-sm ring-1 ring-slate-200"><b>{c.criterion.code}</b> {tj(c.criterion.name)} <span className="text-slate-400">0–{c.maxLevel}</span></span>)}
        </div>
      )}

      <form action={saveEvaluations}>
        <input type="hidden" name="assignmentId" value={a.id} />
        <Card>
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t("student")}</th>
                  <th>{t("status")}</th>
                  {a.criteria.map((c) => <th key={c.criterionId} className="text-center">{c.criterion.code}</th>)}
                  {a.maxScore && <th className="text-center">{t("score")} /{Number(a.maxScore)}</th>}
                  <th>{t("feedback")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  const ev = a.evaluations.find((e) => e.studentId === s.id);
                  const sub = a.submissions.find((x) => x.studentId === s.id);
                  const comment = ev?.comment && typeof ev.comment === "object" ? (ev.comment as { text?: string }).text ?? "" : "";
                  return (
                    <tr key={s.id}>
                      <td className="whitespace-nowrap font-medium"><Link href={`/students/${s.id}`} className="hover:underline">{s.user.lastName} {s.user.firstName}</Link></td>
                      <td>
                        <select name={`sub_${s.id}`} defaultValue={sub?.status ?? "NOT_SUBMITTED"} disabled={!canEdit} className="input py-1 text-xs">
                          {SUBS.map((st) => <option key={st} value={st}>{t(`sub_${st}` as never)}</option>)}
                        </select>
                      </td>
                      {a.criteria.map((c) => (
                        <td key={c.criterionId} className="text-center">
                          <input type="number" min={0} max={c.maxLevel} step={1} name={`lvl_${s.id}_${c.criterionId}`} disabled={!canEdit}
                            defaultValue={ev?.criteria.find((x) => x.criterionId === c.criterionId)?.level ?? ""} className="input w-14 py-1 text-center tabular-nums" />
                        </td>
                      ))}
                      {a.maxScore && <td className="text-center"><input type="number" min={0} max={Number(a.maxScore)} step="0.5" name={`score_${s.id}`} disabled={!canEdit} defaultValue={ev?.score != null ? Number(ev.score) : ""} className="input w-20 py-1 text-center tabular-nums" /></td>}
                      <td><input name={`comment_${s.id}`} defaultValue={comment} disabled={!canEdit} className="input w-full min-w-[14rem] py-1" /></td>
                      <td>{ev && ev.status !== "NOT_EVALUATED" && <Badge tone={ev.status === "SHARED" ? "green" : "amber"}>{t(`ev_${ev.status}` as never)}</Badge>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {canEdit && (
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button className="btn">{t("saveGrades")}</button>
              <button name="publish" value="1" className="btn btn-primary">{t("publishGrades")}</button>
            </div>
          )}
        </Card>
      </form>
    </>
  );
}
