import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { canManageCourse } from "@/lib/access";
import { PageTitle, Card, Notice } from "@/components/ui";
import { createAssignment } from "@/app/actions/assignments";
import { todayIso, addDays } from "@/lib/dates";

export default async function NewAssignmentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ period?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser();
  const { t, tj } = await getT();
  const course = await db.course.findUnique({ where: { id }, include: { subject: { include: { criteria: { orderBy: { code: "asc" } } } }, programme: true } });
  if (!course) notFound();
  if (!(await canManageCourse(user, id))) return <Notice tone="red">{t("accessDenied")}</Notice>;
  const periods = await db.gradingPeriod.findMany({ where: { academicYearId: course.academicYearId, programmeId: course.programmeId, kind: "REPORTING", locked: false }, orderBy: { sortOrder: "asc" } });
  const isDP = course.programme.code === "DP";

  return (
    <>
      <PageTitle back={{ href: `/courses/${id}`, label: course.name }} title={t("newAssignment")} subtitle={`${course.name} · ${tj(course.subject.name)}`} />
      <Card className="max-w-2xl">
        <form action={createAssignment} className="space-y-4">
          <input type="hidden" name="courseId" value={id} />
          <div>
            <label className="label">{t("title")}</label>
            <input name="title" required className="input w-full" placeholder="Суммативная работа: …" />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label">{t("type")}</label>
              <select name="type" className="input w-full" defaultValue="SUMMATIVE">
                <option value="SUMMATIVE">{t("type_SUMMATIVE")}</option>
                <option value="FORMATIVE">{t("type_FORMATIVE")}</option>
              </select>
            </div>
            <div>
              <label className="label">{t("dueDate")}</label>
              <input type="date" name="due" required className="input w-full" defaultValue={addDays(todayIso(), 7)} />
            </div>
            <div>
              <label className="label">{t("period")}</label>
              <select name="periodId" className="input w-full" defaultValue={periods.find((p) => p.abbreviation === sp.period)?.id}>
                {periods.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          {course.subject.criteria.length > 0 && (
            <div>
              <label className="label">{t("forCriteria")}</label>
              <div className="grid gap-2 sm:grid-cols-2">
                {course.subject.criteria.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
                    <input type="checkbox" name="criteria" value={c.id} />
                    <b>{c.code}</b> {tj(c.name)} <span className="ml-auto text-xs text-slate-400">0–{c.maxLevel}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="label">{t("maxScore")}</label>
            <input type="number" name="maxScore" min={1} step="0.5" className="input w-32" defaultValue={isDP ? 50 : undefined} />
            <p className="mt-1 text-xs text-slate-500">{t("maxScoreHint")}</p>
          </div>
          <div>
            <label className="label">{t("instructions")}</label>
            <textarea name="instructions" rows={3} className="input w-full" />
          </div>
          <div className="flex justify-end gap-2">
            <a href={`/courses/${id}`} className="btn">{t("cancel")}</a>
            <button className="btn btn-primary">{t("create")}</button>
          </div>
        </form>
      </Card>
    </>
  );
}
