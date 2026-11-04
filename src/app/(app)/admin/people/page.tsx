import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { canAdmin } from "@/lib/access";
import { PageTitle, Card, Notice, Tabs, Badge } from "@/components/ui";
import type { DictKey } from "@/lib/i18n-dict";

export default async function PeoplePage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string }> }) {
  const user = await requireUser();
  const { t } = await getT();
  if (!canAdmin(user)) return <Notice tone="red">{t("accessDenied")}</Notice>;
  const sp = await searchParams;
  const tab = sp.tab === "staff" || sp.tab === "parents" ? sp.tab : "students";
  const q = (sp.q ?? "").trim();
  const nameFilter = q ? { OR: [{ lastName: { contains: q, mode: "insensitive" as const } }, { firstName: { contains: q, mode: "insensitive" as const } }, { email: { contains: q, mode: "insensitive" as const } }] } : {};

  const tabs = Tabs({ items: [
    { href: "/admin/people?tab=students", label: t("students"), active: tab === "students" },
    { href: "/admin/people?tab=staff", label: t("role_TEACHER"), active: tab === "staff" },
    { href: "/admin/people?tab=parents", label: t("role_GUARDIAN"), active: tab === "parents" },
  ] });

  let body: React.ReactNode = null;
  if (tab === "students") {
    const list = await db.studentProfile.findMany({
      where: { user: nameFilter },
      include: { user: true, groupMembers: { include: { group: true } }, guardians: { include: { guardian: { include: { user: true } } } } },
      orderBy: { user: { lastName: "asc" } },
    });
    body = (
      <table className="tbl">
        <thead><tr><th>{t("student")}</th><th>ID</th><th>{t("homeroom")}</th><th>Email</th><th>{t("role_GUARDIAN")}</th></tr></thead>
        <tbody>{list.map((s) => (
          <tr key={s.id}>
            <td><Link className="link" href={`/students/${s.id}`}>{s.user.lastName} {s.user.firstName}</Link></td>
            <td className="font-mono text-xs">{s.studentUid}</td>
            <td>{s.groupMembers.map((g) => g.group.name).join(", ")}</td>
            <td className="text-xs text-slate-500">{s.user.email}</td>
            <td className="text-xs">{s.guardians.map((g) => `${g.guardian.user.lastName} ${g.guardian.user.firstName}${g.approved ? "" : " (?)"}`).join(", ")}</td>
          </tr>
        ))}</tbody>
      </table>
    );
  } else if (tab === "staff") {
    const list = await db.staffProfile.findMany({ where: { user: nameFilter }, include: { user: { include: { roles: { include: { programme: true } } } }, courseStaff: { include: { course: true } } }, orderBy: { user: { lastName: "asc" } } });
    body = (
      <table className="tbl">
        <thead><tr><th>{t("teacher")}</th><th>{t("status")}</th><th>{t("courses")}</th><th>Email</th></tr></thead>
        <tbody>{list.map((s) => (
          <tr key={s.id}>
            <td><div className="font-medium">{s.user.lastName} {s.user.firstName}</div><div className="text-xs text-slate-500">{s.displayTitle}</div></td>
            <td><div className="flex flex-wrap gap-1">{s.user.roles.map((r) => <Badge key={r.id} tone={r.role === "TEACHER" ? "slate" : "blue"}>{t(`role_${r.role}` as DictKey)}{r.programme ? ` ${r.programme.code}` : ""}</Badge>)}</div></td>
            <td className="text-xs">{s.courseStaff.map((c) => c.course.name).join(", ")}</td>
            <td className="text-xs text-slate-500">{s.user.email}</td>
          </tr>
        ))}</tbody>
      </table>
    );
  } else {
    const list = await db.guardianProfile.findMany({ where: { user: nameFilter }, include: { user: true, students: { include: { student: { include: { user: true, groupMembers: { include: { group: true } } } } } } }, orderBy: { user: { lastName: "asc" } } });
    body = (
      <table className="tbl">
        <thead><tr><th>{t("role_GUARDIAN")}</th><th>{t("child")}</th><th>Email</th><th>Тел.</th></tr></thead>
        <tbody>{list.map((g) => (
          <tr key={g.id}>
            <td className="font-medium">{g.user.lastName} {g.user.firstName}</td>
            <td className="text-sm">{g.students.map((s) => `${s.student.user.firstName} (${s.student.groupMembers[0]?.group.name ?? ""}, ${s.relation ?? ""})`).join("; ")}</td>
            <td className="text-xs text-slate-500">{g.user.email}</td>
            <td className="text-xs text-slate-500">{g.phone}</td>
          </tr>
        ))}</tbody>
      </table>
    );
  }
  return (
    <>
      <PageTitle title={t("navPeople")} actions={
        <form className="flex gap-2"><input type="hidden" name="tab" value={tab} /><input name="q" defaultValue={q} placeholder={t("search")} className="input" /><button className="btn">{t("search")}</button></form>
      } />
      {tabs}
      <Card><div className="overflow-x-auto">{body}</div></Card>
    </>
  );
}
