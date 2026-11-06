import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { canAdmin } from "@/lib/access";
import { PageTitle, Card, Notice, Badge } from "@/components/ui";
import { fmtDateTime } from "@/lib/dates";

export default async function AuditPage() {
  const user = await requireUser();
  const { t, locale } = await getT();
  if (!canAdmin(user)) return <Notice tone="red">{t("accessDenied")}</Notice>;
  const logs = await db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  const actors = new Map((await db.user.findMany({ where: { id: { in: logs.map((l) => l.actorId!).filter(Boolean) } } })).map((u) => [u.id, u]));
  return (
    <>
      <PageTitle title={t("auditLog")} subtitle="Входы и доступ, изменения итоговых оценок, публикация и блокировка периодов, импорт и экспорт" />
      <Card>
        <table className="tbl">
          <thead><tr><th>{t("when")}</th><th>{t("who")}</th><th>{t("action")}</th><th>Детали</th></tr></thead>
          <tbody>{logs.map((l) => {
            const a = l.actorId ? actors.get(l.actorId) : null;
            const m = (l.meta ?? {}) as Record<string, unknown>;
            return (
              <tr key={l.id}>
                <td className="whitespace-nowrap text-xs">{fmtDateTime(l.createdAt, locale)}</td>
                <td className="whitespace-nowrap">{a ? `${a.lastName} ${a.firstName}` : "—"}</td>
                <td><Badge tone={l.action.includes("OVERRIDE") ? "violet" : l.action.includes("LOCK") ? "amber" : "blue"}>{l.action}</Badge></td>
                <td className="text-xs text-slate-600">{Object.entries(m).filter(([, v]) => v != null).map(([k, v]) => `${k}: ${v}`).join(" · ")}</td>
              </tr>
            );
          })}</tbody>
        </table>
      </Card>
    </>
  );
}
