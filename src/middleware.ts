import { NextResponse, type NextRequest } from "next/server";

/** Пробрасывает текущий путь в заголовок, чтобы серверный layout подсвечивал меню. */
export function middleware(req: NextRequest) {
  const h = new Headers(req.headers);
  h.set("x-pathname", req.nextUrl.pathname);
  if (!req.cookies.get("demo_uid") && !req.nextUrl.pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next({ request: { headers: h } });
}
export const config = { matcher: ["/((?!_next|favicon.ico|api).*)"] };
