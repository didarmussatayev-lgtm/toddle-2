import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { loginAs, loginWithPassword } from "@/app/actions/session";
import { LocaleSwitch } from "@/components/LocaleSwitch";
import { config } from "@/lib/config";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  invalid: "Неверный email или пароль.",
  locked: "Слишком много неудачных попыток. Вход временно заблокирован на 15 минут.",
  rate: "Слишком много попыток входа. Подождите несколько минут.",
  google: "Не удалось войти через Google. Попробуйте ещё раз.",
  google_state: "Сеанс входа через Google устарел. Попробуйте ещё раз.",
  google_unknown: "Этот Google-аккаунт не зарегистрирован в журнале. Обратитесь к администратору школы.",
  google_domain: "Сотрудники и ученики входят только со школьного Google-аккаунта.",
  google_off: "Вход через Google не настроен.",
  email_unverified: "Email Google-аккаунта не подтверждён.",
};

function LoginForm({ error, schoolName }: { error?: string; schoolName: string }) {
  return (
    <div className="card mx-auto max-w-sm p-6">
      <div className="mb-1 text-sm font-medium text-brand-600">{schoolName}</div>
      <h1 className="mb-4 text-xl font-semibold">Вход в Журнал IB</h1>
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{ERRORS[error] ?? ERRORS.invalid}</div>}
      {config.googleEnabled && (
        <>
          <a href="/auth/google" className="btn w-full py-2">
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
            Войти через Google
          </a>
          <div className="my-4 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" />или по паролю<span className="h-px flex-1 bg-slate-200" /></div>
        </>
      )}
      <form action={loginWithPassword} className="space-y-3">
        <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" required autoComplete="username" maxLength={200} className="input w-full" /></div>
        <div><label className="label" htmlFor="password">Пароль</label><input id="password" name="password" type="password" required autoComplete="current-password" maxLength={200} className="input w-full" /></div>
        <button className="btn btn-primary w-full py-2">Войти</button>
      </form>
      <p className="mt-4 text-xs text-slate-500">Нет пароля или забыли его? Администратор школы выдаст одноразовую ссылку для установки пароля.</p>
    </div>
  );
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  // В рабочем режиме вошедшего пользователя отправляем на главную; на демо-стенде можно переключать роли
  if (!config.demoMode && (await getSessionUserId())) redirect("/");
  const { error } = await searchParams;
  const { t, tj, locale } = await getT();
  const school = await db.school.findFirst();
  if (!config.demoMode) {
    return (
      <main className="px-4 py-12">
        <div className="mx-auto mb-6 flex max-w-sm justify-end"><LocaleSwitch current={locale} back="/login" /></div>
        <LoginForm error={error} schoolName={tj(school?.name)} />
      </main>
    );
  }
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
      <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_24rem]">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <b>Демо-режим (DEMO_MODE=true).</b> Вход по ролям без пароля доступен только на демо-стенде с вымышленными данными.
          В рабочей версии этот блок не отображается, а вход возможен только через Google или по паролю.
        </div>
        <LoginForm error={error} schoolName={tj(school?.name)} />
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
