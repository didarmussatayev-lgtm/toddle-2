import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { generateCodeVerifier, generateState } from "arctic";
import { config } from "@/lib/config";
import { googleClient } from "@/lib/auth/google";
import { rateLimit } from "@/lib/security/rate-limit";
import { clientIp } from "@/lib/security/request";

/** Шаг 1: перенаправление в Google. state и PKCE-верификатор — в короткоживущих httpOnly-cookie. */
export async function GET() {
  if (!config.googleEnabled) return NextResponse.redirect(`${config.appUrl}/login?error=google_off`);
  if (!rateLimit(`google:${await clientIp()}`, 30, 15 * 60_000).ok) return NextResponse.redirect(`${config.appUrl}/login?error=rate`);
  const state = generateState();
  const verifier = generateCodeVerifier();
  const url = googleClient().createAuthorizationURL(state, verifier, ["openid", "email", "profile"]);
  url.searchParams.set("prompt", "select_account");
  if (config.google.allowedDomains.length === 1) url.searchParams.set("hd", config.google.allowedDomains[0]);
  const jar = await cookies();
  const opts = { httpOnly: true, secure: config.cookieSecure, sameSite: "lax" as const, path: "/auth/google", maxAge: 600 };
  jar.set("g_state", state, opts);
  jar.set("g_verifier", verifier, opts);
  return NextResponse.redirect(url);
}
