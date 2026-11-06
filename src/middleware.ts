import { NextResponse, type NextRequest } from "next/server";

const PUBLIC = ["/login", "/auth/", "/invite/", "/api/health"];
const SESSION_COOKIES = ["__Host-sid", "sid"];

/**
 * Быстрый фильтр: без cookie сессии — на страницу входа.
 * Настоящая проверка сессии и прав выполняется на сервере в каждой странице и действии.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const h = new Headers(req.headers);
  h.set("x-pathname", pathname);
  const isPublic = PUBLIC.some((p) => pathname === p || pathname.startsWith(p));
  if (!isPublic && !SESSION_COOKIES.some((c) => req.cookies.get(c))) {
    if (pathname.startsWith("/api/")) return new NextResponse("Unauthorized", { status: 401 });
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next({ request: { headers: h } });
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
