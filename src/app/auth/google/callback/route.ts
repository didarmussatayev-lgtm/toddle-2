import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { decodeIdToken } from "arctic";
import { db } from "@/lib/db";
import { config } from "@/lib/config";
import { googleClient, googleLoginProblem, type GoogleClaims } from "@/lib/auth/google";
import { createSession } from "@/lib/session";
import { safeEqual } from "@/lib/security/tokens";
import { clientIp } from "@/lib/security/request";

const fail = (code: string) => NextResponse.redirect(`${config.appUrl}/login?error=${code}`);

/**
 * Шаг 2: Google вернул code. Проверяем state (CSRF), обмениваем code с PKCE,
 * берём подтверждённый email и ищем заранее заведённого пользователя. Самостоятельной регистрации нет.
 */
export async function GET(req: NextRequest) {
  if (!config.googleEnabled) return fail("google_off");
  const jar = await cookies();
  const state = req.nextUrl.searchParams.get("state") ?? "";
  const code = req.nextUrl.searchParams.get("code") ?? "";
  const savedState = jar.get("g_state")?.value ?? "";
  const verifier = jar.get("g_verifier")?.value ?? "";
  jar.delete({ name: "g_state", path: "/auth/google" });
  jar.delete({ name: "g_verifier", path: "/auth/google" });
  if (!code || !state || !savedState || !verifier || !safeEqual(state, savedState)) return fail("google_state");

  let claims: GoogleClaims;
  try {
    // id_token получен напрямую с token-эндпоинта Google по TLS — по OIDC его подпись можно не проверять отдельно
    const tokens = await googleClient().validateAuthorizationCode(code, verifier);
    claims = decodeIdToken(tokens.idToken()) as GoogleClaims;
  } catch {
    return fail("google");
  }
  const school = await db.school.findFirst({ select: { id: true } });
  const audit = (action: string, actorId: string | null, meta: Record<string, unknown>) =>
    school ? db.auditLog.create({ data: { schoolId: school.id, actorId, action, entityType: "User", entityId: actorId, meta: meta as object } }) : null;
  const ip = await clientIp();

  const email = (claims.email ?? "").toLowerCase();
  const user = email
    ? await db.user.findFirst({ where: { email: { equals: email, mode: "insensitive" }, deletedAt: null, status: { in: ["ACTIVE", "INVITED"] } }, include: { roles: true, authAccounts: { where: { provider: "google" } } } })
    : null;
  if (!user) {
    await audit("LOGIN_FAILED", null, { method: "google", email, reason: "unknown_user", ip });
    return fail("google_unknown");
  }
  const problem = googleLoginProblem(claims, user.roles.map((r) => r.role), config.google.allowedDomains);
  if (problem) {
    await audit("LOGIN_FAILED", user.id, { method: "google", email, reason: problem, ip });
    return fail(problem === "domain" ? "google_domain" : "google");
  }
  // Привязка: один Google-аккаунт (sub) — один пользователь. Если email уже привязан к другому sub — отказ.
  const linked = user.authAccounts[0];
  if (linked && linked.providerAccountId !== claims.sub) {
    await audit("LOGIN_FAILED", user.id, { method: "google", email, reason: "sub_mismatch", ip });
    return fail("google");
  }
  const other = await db.authAccount.findUnique({ where: { provider_providerAccountId: { provider: "google", providerAccountId: claims.sub } } });
  if (other && other.userId !== user.id) return fail("google");
  if (!linked) await db.authAccount.create({ data: { userId: user.id, provider: "google", providerAccountId: claims.sub } });
  if (user.status === "INVITED") await db.user.update({ where: { id: user.id }, data: { status: "ACTIVE" } });

  await createSession(user.id);
  await audit("LOGIN_SUCCESS", user.id, { method: "google", ip });
  return NextResponse.redirect(`${config.appUrl}/`);
}
