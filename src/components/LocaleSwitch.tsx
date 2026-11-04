import { setLocale } from "@/app/actions/session";
import { LOCALES, type Loc } from "@/lib/i18n-dict";

export function LocaleSwitch({ current, back = "/" }: { current: Loc; back?: string }) {
  return (
    <form action={setLocale} className="flex overflow-hidden rounded-lg border border-slate-300 text-xs">
      <input type="hidden" name="back" value={back} />
      {LOCALES.map((l) => (
        <button key={l} name="locale" value={l} className={`px-2 py-1 font-medium uppercase ${l === current ? "bg-slate-800 text-white" : "bg-white text-slate-600 hover:bg-slate-100"}`}>
          {l}
        </button>
      ))}
    </form>
  );
}
