import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { canAdmin } from "@/lib/access";
import { PageTitle, Card, Notice, Grade7 } from "@/components/ui";

export default async function PolicyPage() {
  const user = await requireUser();
  const { t, tj } = await getT();
  if (!canAdmin(user)) return <Notice tone="red">{t("accessDenied")}</Notice>;
  const programmes = await db.programme.findMany({
    orderBy: { code: "desc" },
    include: {
      gradingPolicies: { include: { boundarySets: { include: { boundaries: { orderBy: { grade: "asc" } } }, orderBy: { criteriaCount: "desc" } }, percentToGrade: { orderBy: { grade: "asc" } } } },
      gradeScales: { include: { entries: { orderBy: { sortOrder: "asc" } } } },
      periods: { where: { kind: "REPORTING" }, take: 1, include: { categoryWeights: { include: { category: true } } } },
    },
  });
  const thresholds = await db.performanceThreshold.findMany();
  return (
    <>
      <PageTitle title={t("navPolicy")} subtitle="GradingPolicy · GradeBoundary · PercentGradeBand · GradeScale · CategoryWeight" />
      <Notice>Все правила хранятся в таблицах БД, а не в коде. Таблицы для 1–3 критериев и DP-проценты — демонстрационные: заменить значениями из политики школы (Прил. 1 и 4).</Notice>
      {programmes.map((p) => {
        const pol = p.gradingPolicies[0];
        const five = p.gradeScales.find((s) => s.type === "DEPENDENT");
        return (
          <div key={p.id} className="mb-8">
            <h2 className="mb-3 text-lg font-semibold">{tj(p.name)}</h2>
            <div className="grid gap-6 lg:grid-cols-3">
              {pol && pol.boundarySets.length > 0 && p.code === "MYP" && (
                <Card title={t("boundaries")} className="lg:col-span-2">
                  <table className="tbl">
                    <thead><tr><th>{t("criteriaCount")}</th>{[1, 2, 3, 4, 5, 6, 7].map((g) => <th key={g} className="text-center"><Grade7 value={g} /></th>)}</tr></thead>
                    <tbody>{pol.boundarySets.map((s) => (
                      <tr key={s.id}><td className="font-medium">{s.criteriaCount} (max {s.criteriaCount * 8})</td>{s.boundaries.map((b) => <td key={b.id} className="text-center tabular-nums">{b.minTotal}–{b.maxTotal}</td>)}</tr>
                    ))}</tbody>
                  </table>
                </Card>
              )}
              {pol && (
                <Card title={t("percentBands")}>
                  <table className="tbl"><tbody>{pol.percentToGrade.map((b) => <tr key={b.id}><td className="tabular-nums">{Number(b.minPct)}–{Number(b.maxPct)}%</td><td><Grade7 value={b.grade} /></td></tr>)}</tbody></table>
                </Card>
              )}
              {five && (
                <Card title={t("fiveScale")}>
                  <table className="tbl"><tbody>{five.entries.map((e) => <tr key={e.id}><td>IB {e.sourceValues.join(", ")}</td><td className="font-semibold">→ {e.label}</td></tr>)}</tbody></table>
                </Card>
              )}
              {pol && (
                <Card title={t("navPolicy")}>
                  <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 text-sm">
                    <dt className="text-slate-500">{t("aggregation")}</dt><dd className="font-mono text-xs">{pol.criterionAggregation}</dd>
                    <dt className="text-slate-500">Критериальная схема</dt><dd>{pol.useCriteriaMethod ? "✓" : "—"}</dd>
                    <dt className="text-slate-500">Процентная схема</dt><dd>{pol.usePercentMethod ? "✓" : "—"}</dd>
                    <dt className="text-slate-500">Суммативных в день, max</dt><dd>{pol.maxSummativePerDay}</dd>
                    <dt className="text-slate-500">Формативные в итоге</dt><dd>{pol.allowFormativeInFinal ? "✓" : "—"}</dd>
                    <dt className="text-slate-500">Годовая (S1/S2)</dt><dd className="font-mono text-xs">{JSON.stringify(pol.annualWeights)}</dd>
                    {pol.examWeight && <><dt className="text-slate-500">Вес экзамена (9 кл.)</dt><dd>{Number(pol.examWeight) * 100}%</dd></>}
                  </dl>
                </Card>
              )}
              <Card title={t("categoryWeights")}>
                <table className="tbl"><tbody>{p.periods[0]?.categoryWeights.filter((w) => !w.courseId).map((w) => <tr key={w.id}><td>{tj(w.category.name)}</td><td className="tabular-nums">{Number(w.weight)}%</td></tr>)}</tbody></table>
                <div className="mt-3 text-xs text-slate-500">Пороги риска: {thresholds.filter((x) => x.programmeId === p.id).map((x) => `${x.metric} < ${Number(x.value)}`).join(", ")}</div>
              </Card>
            </div>
          </div>
        );
      })}
    </>
  );
}
