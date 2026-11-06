import { db } from "@/lib/db";
import { sha256 } from "@/lib/security/tokens";
import { setPasswordWithToken } from "@/app/actions/accounts";
import { PASSWORD_ERRORS } from "@/lib/security/password";

export const dynamic = "force-dynamic";
export const metadata = { referrer: "no-referrer" };

const ERR: Record<string, string> = { ...PASSWORD_ERRORS, mismatch: "Пароли не совпадают", rate: "Слишком много попыток, попробуйте позже" };

export default async function InvitePage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string }> }) {
  const { token } = await params;
  const { error } = await searchParams;
  const lt = token !== "expired" && token.length <= 100 ? await db.loginToken.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } }) : null;
  const valid = lt && !lt.usedAt && lt.expiresAt > new Date() && lt.user.status !== "DISABLED" && !lt.user.deletedAt;
  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <div className="card p-6">
        <h1 className="text-xl font-semibold">Журнал IB · установка пароля</h1>
        {!valid ? (
          <p className="mt-3 text-sm text-slate-600">Ссылка недействительна: она уже использована, истекла или доступ закрыт. Попросите администратора школы выдать новую.</p>
        ) : (
          <form action={setPasswordWithToken} className="mt-4 space-y-3">
            <p className="text-sm text-slate-600">{lt!.user.lastName} {lt!.user.firstName} · {lt!.user.email}</p>
            {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{ERR[error] ?? "Ошибка"}</div>}
            <input type="hidden" name="token" value={token} />
            <input type="email" name="username" autoComplete="username" defaultValue={lt!.user.email} hidden readOnly />
            <div><label className="label">Новый пароль (не короче 10 символов)</label><input type="password" name="password" required minLength={10} maxLength={200} autoComplete="new-password" className="input w-full" /></div>
            <div><label className="label">Повторите пароль</label><input type="password" name="confirm" required minLength={10} maxLength={200} autoComplete="new-password" className="input w-full" /></div>
            <p className="text-xs text-slate-500">Совет: используйте фразу из нескольких слов. После установки пароля все другие сеансы будут завершены.</p>
            <button className="btn btn-primary w-full">Сохранить и войти</button>
          </form>
        )}
      </div>
    </main>
  );
}
