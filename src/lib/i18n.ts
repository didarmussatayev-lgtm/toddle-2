import { cookies } from "next/headers";
import { LOCALES, type Loc, translate, trJson, type DictKey } from "./i18n-dict";

export async function getLocale(): Promise<Loc> {
  const c = (await cookies()).get("locale")?.value;
  return (LOCALES as readonly string[]).includes(c ?? "") ? (c as Loc) : "ru";
}

export async function getT() {
  const locale = await getLocale();
  return {
    locale,
    t: (k: DictKey) => translate(locale, k),
    tj: (v: unknown) => trJson(locale, v),
  };
}
