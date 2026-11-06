import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { isSchoolAdmin } from "@/lib/access";
import { PageTitle, Card, Notice, Badge } from "@/components/ui";
import { InviteLinkForm } from "@/components/InviteLinkForm";
import { setAccess, revokeSessions } from "@/app/actions/accounts";
import { fmtDateTime } from "@/lib/dates";
import type { DictKey } from "@/lib/i18n-dict";

export default async function UserAccessPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const me = await requireUser();
  const { t, locale } = await getT();
  if (!isSchoolAdmin(me)) return <Notice tone="red">{t("accessDenied")}</Notice>;
  if (!/^[0-9a-f-]{36}$/.test(userId)) notFound();
  const u = await db.user.findFirst({
    where: { id: userId, schoolId: me.schoolId },
    include: { roles: { include: { programme: true } }, authAccounts: true, sessions: { orderBy: { lastSeenAt: "desc" } }, loginTokens: { orderBy: { createdAt: "desc" }, take: 5 } },
  });
  if (!u) notFound();
  const logins = await db.auditLog.findMany({ where: { entityType: "User", entityId: u.id }, orderBy: { createdAt: "desc" }, take: 20 });
  const google = u.authAccounts.find((a) => a.provider === "google");

  return (
    <>
      <PageTitle back={{ href: "/admin/people", label: t("navPeople") }} title={`${u.lastName} ${u.firstName}`} subtitle={u.email}
        actions={<div className="flex flex-wrap gap-1">{u.roles.map((r) => <Badge key={r.id} tone="blue">{t(`role_${r.role}` as DictKey)}{r.programme ? ` ${r.programme.code}` : ""}</Badge>)}</div>} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Доступ">
          <dl className="mb-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-slate-500">Статус</dt>
            <dd>{u.status === "ACTIVE" ? <Badge tone="green">Активен</Badge> : u.status === "INVITED" ? <Badge tone="amber">Приглашён</Badge> : <Badge tone="red">Заблокирован</Badge>}
              {u.lockedUntil && u.lockedUntil > new Date() && <span className="ml-2"><Badge tone="red">Временная блокировка до {fmtDateTime(u.lockedUntil, locale)}</Badge></span>}</dd>
            <dt className="text-slate-500">Пароль</dt><dd>{u.passwordHash ? `задан ${fmtDateTime(u.passwordChangedAt, locale)}` : "не задан"}</dd>
            <dt className="text-slate-500">Google</dt><dd>{google ? "привязан" : "не привязан (привяжется при первом входе по email)"}</dd>
            <dt className="text-slate-500">Последняя активность</dt><dd>{fmtDateTime(u.lastActiveAt, locale)}</dd>
          </dl>
          <InviteLinkForm userId={u.id} label={u.passwordHash ? "Ссылка для сброса пароля" : "Ссылка-приглашение (установить пароль)"} />
          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            <form action={setAccess}>
              <input type="hidden" name="userId" value={u.id} /><input type="hidden" name="enable" value={u.status === "DISABLED" ? "1" : "0"} />
              <button className={`btn ${u.status === "DISABLED" ? "" : "btn-danger"}`} disabled={u.id === me.id}>{u.status === "DISABLED" ? "Разблокировать доступ" : "Заблокировать доступ"}</button>
            </form>
            <form action={revokeSessions}><input type="hidden" name="userId" value={u.id} /><button className="btn">Завершить все сеансы ({u.sessions.length})</button></form>
          </div>
        </Card>
        <Card title="Активные сеансы">
          {u.sessions.length === 0 ? <div className="text-sm text-slate-500">Нет</div> : (
            <table className="tbl"><thead><tr><th>Начат</th><th>Активность</th><th>IP</th><th>Браузер</th></tr></thead>
              <tbody>{u.sessions.map((s) => <tr key={s.id}><td className="text-xs">{fmtDateTime(s.createdAt, locale)}</td><td className="text-xs">{fmtDateTime(s.lastSeenAt, locale)}</td><td className="font-mono text-xs">{s.ip}</td><td className="max-w-[14rem] truncate text-xs text-slate-500" title={s.userAgent ?? ""}>{s.userAgent}</td></tr>)}</tbody></table>
          )}
        </Card>
      </div>
      <Card title="События входа и доступа" className="mt-6">
        <table className="tbl"><thead><tr><th>{t("when")}</th><th>{t("action")}</th><th>Детали</th></tr></thead>
          <tbody>{logins.map((l) => <tr key={l.id}><td className="whitespace-nowrap text-xs">{fmtDateTime(l.createdAt, locale)}</td><td><Badge tone={l.action.includes("FAIL") || l.action.includes("LOCK") || l.action.includes("DISABLED") ? "red" : "slate"}>{l.action}</Badge></td>
            <td className="text-xs text-slate-600">{Object.entries((l.meta ?? {}) as Record<string, unknown>).map(([k, v]) => `${k}: ${v}`).join(" · ")}</td></tr>)}</tbody></table>
      </Card>
    </>
  );
}
