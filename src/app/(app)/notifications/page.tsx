import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { PageTitle, Card } from "@/components/ui";
import { markAllRead } from "@/app/actions/notifications";
import { fmtDateTime } from "@/lib/dates";

export default async function NotificationsPage() {
  const user = await requireUser();
  const { t, locale } = await getT();
  const list = await db.notification.findMany({ where: { recipientId: user.id }, orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <>
      <PageTitle title={t("navNotifications")} actions={<form action={markAllRead}><button className="btn btn-sm">{t("markAllRead")}</button></form>} />
      <Card>
        {list.length === 0 ? <div className="text-sm text-slate-500">{t("noNotifications")}</div> : (
          <ul className="divide-y divide-slate-100">
            {list.map((n) => (
              <li key={n.id} className="flex items-center gap-3 py-2.5">
                <span className={`h-2 w-2 shrink-0 rounded-full ${n.readAt ? "bg-slate-200" : "bg-brand-600"}`} />
                <div className="min-w-0 flex-1">
                  <div className={`text-sm ${n.readAt ? "text-slate-600" : "font-medium"}`}>{n.title}</div>
                  {n.body && <div className="text-xs text-slate-500">{n.body}</div>}
                </div>
                <span className="text-xs text-slate-400">{fmtDateTime(n.createdAt, locale)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
