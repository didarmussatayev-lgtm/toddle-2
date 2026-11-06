"use client";

/** Общая страница ошибки: без технических подробностей (они пишутся только в лог сервера). */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">Что-то пошло не так</h1>
      <p className="mt-2 text-sm text-slate-600">Действие не выполнено. Возможно, у вас нет прав на эту операцию или период заблокирован.</p>
      {error.digest && <p className="mt-2 font-mono text-xs text-slate-400">Код: {error.digest}</p>}
      <div className="mt-6 flex justify-center gap-2">
        <button className="btn" onClick={() => reset()}>Повторить</button>
        <a className="btn btn-primary" href="/">На главную</a>
      </div>
    </main>
  );
}
