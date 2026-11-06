import { Google } from "arctic";
import { config } from "../config";

export const googleClient = () => new Google(config.google.clientId, config.google.clientSecret, `${config.appUrl}/auth/google/callback`);

export type GoogleClaims = { sub: string; email?: string; email_verified?: boolean; hd?: string; name?: string };

/**
 * Можно ли войти этому пользователю через Google с данным аккаунтом.
 * Сотрудники и ученики — только с домена Google Workspace школы (если он задан); родители — с любого подтверждённого Gmail.
 */
export function googleLoginProblem(claims: GoogleClaims, roles: string[], allowedDomains: string[]): string | null {
  if (!claims.email || claims.email_verified !== true) return "email_unverified";
  const isGuardianOnly = roles.length > 0 && roles.every((r) => r === "GUARDIAN");
  if (allowedDomains.length && !isGuardianOnly) {
    const hd = (claims.hd ?? "").toLowerCase();
    if (!allowedDomains.includes(hd)) return "domain";
  }
  return null;
}
