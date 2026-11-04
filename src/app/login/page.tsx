import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { loginAs } from "@/app/actions/session";
import { LocaleSwitch } from "@/components/LocaleSwitch";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const { t, tj, locale } = await getT();
  const school = await db.school.findFirst();
  const users = await db.user.findMany({
    where: { status: "ACTIVE", deletedAt: null },
    include: {
      roles: { include: { programme: true } },
      staffProfile: true,
      studentProfile: { include: { groupMembers: { include: { group: true } } } },
      guardianProfile: { include: { students: { include: { student: { include: { user: true, groupMembers: { include: { group: true } } } } } } } },
    },
    orderBy: [{ lastName: "asc" }],
  });
  const has = (u: (typeof users)[number], r: string) => u.roles.some((x) => x.role === r);
  const admins = users.filter((u) => has(u, "SCHOOL_ADMIN") || has(u, "COORDINATOR") || has(u, "DEPUTY_HEAD"));
  const teachers = users.filter((u) => has(u, "TEACHER") && !admins.includes(u));
  const students = users.filter((u) => has(u, "STUDENT"));
  const studentsByClass = new Map<string, typeof students>();
  for (const s of students) {
    const cls = s.studentProfile?.groupMembers[0]?.group.name ?? "—";
    studentsByClass.set(cls, [...(studentsByClass.get(cls) ?? []), s]);
  }
  const guardians = users.filter((u) => has(u, "GUARDIAN")).sort((a, b) => (b.guardianProfile?.students.length ?? 0) - (a.guardianProfile?.students.length ?? 0)).slice(0, 8);

  const UserBtn = ({ u, sub }: { u: (typeof users)[number]; sub: string }) => (
    <form action={loginAs}>
      <input type="hidden" name="userId" value={u.id} />
      <button className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left hover:border-brand-500 hover:bg-brand-50">
        <div className="text-sm font-medium">{u.lastName} {u.firstName}</div>
        <div className="truncate text-xs text-slate-500">{sub}</div>
      </button>
    </form>
  );
  const roleLabel = (u: (typeof users)[number]) =>
    u.roles.filter((r) => r.role !== "TEACHER" || u.roles.length === 1).map((r) => t(`role_${r.role}` as never) + (r.programme ? ` ${r.programme.code}` : "")).join(", ");

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-brand-600">{tj(school?.name)}</div>
          <h1 className="text-3xl font-semibold tracking-tight">{t("appName")} · {t("demoLoginTitle")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">{t("demoLoginHint")}</p>
        </div>
        <LocaleSwitch current={locale} back="/login" />
      </div>
      <div className="grid gap-6 lg:grid-cols-4">
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{t("navAdmin")}</h2>
          <div className="space-y-2">{admins.map((u) => <UserBtn key={u.id} u={u} sub={roleLabel(u)} />)}</div>
        </section>
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{t("role_TEACHER")}</h2>
          <div className="space-y-2">{teachers.map((u) => <UserBtn key={u.id} u={u} sub={u.staffProfile?.displayTitle ?? ""} />)}</div>
        </section>
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{t("role_STUDENT")}</h2>
          <div className="space-y-3">
            {[...studentsByClass.entries()].map(([cls, list]) => (
              <div key={cls}>
                <div className="mb-1 text-xs text-slate-400">{cls}</div>
                <div className="space-y-2">{list.slice(0, 3).map((u) => <UserBtn key={u.id} u={u} sub={u.email} />)}</div>
              </div>
            ))}
          </div>
        </section>
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{t("role_GUARDIAN")}</h2>
          <div className="space-y-2">
            {guardians.map((u) => (
              <UserBtn key={u.id} u={u} sub={u.guardianProfile!.students.map((s) => `${s.student.user.firstName} (${s.student.groupMembers[0]?.group.name ?? ""})`).join(", ")} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
