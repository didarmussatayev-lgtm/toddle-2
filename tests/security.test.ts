import { describe, it, expect } from "vitest";
import { passwordProblem, hashPassword, verifyPassword } from "@/lib/security/password";
import { rateLimit, hits, record, resetRateLimit } from "@/lib/security/rate-limit";
import { randomToken, sha256, safeEqual } from "@/lib/security/tokens";
import { googleLoginProblem } from "@/lib/auth/google";
import { isUuid } from "@/lib/validate";

describe("пароли", () => {
  it("политика", () => {
    expect(passwordProblem("short", "a@b.kz")).toBe("short");
    expect(passwordProblem("qwertyuiop", "a@b.kz")).toBe("common");
    expect(passwordProblem("aidana-2026-x", "aidana@school.kz")).toBe("email");
    expect(passwordProblem("aaaaaaaaaaab", "x@y.kz")).toBe("variety");
    expect(passwordProblem("Синий-трамвай-2026", "teacher@school.kz")).toBeNull();
  });
  it("argon2id: хэш не равен паролю, проверка работает", async () => {
    const h = await hashPassword("Синий-трамвай-2026");
    expect(h.startsWith("$argon2id$")).toBe(true);
    expect(await verifyPassword(h, "Синий-трамвай-2026")).toBe(true);
    expect(await verifyPassword(h, "синий-трамвай-2026")).toBe(false);
    expect(await verifyPassword(null, "anything")).toBe(false);
  });
});

describe("ограничение частоты", () => {
  it("пропускает до лимита и блокирует после", () => {
    const k = "test:" + randomToken(4);
    for (let i = 0; i < 3; i++) expect(rateLimit(k, 3, 60_000).ok).toBe(true);
    const r = rateLimit(k, 3, 60_000);
    expect(r.ok).toBe(false);
    expect(r.retryAfterSec).toBeGreaterThan(0);
    resetRateLimit(k);
    expect(rateLimit(k, 3, 60_000).ok).toBe(true);
  });
  it("учёт неудачных попыток", () => {
    const k = "fail:" + randomToken(4);
    record(k); record(k);
    expect(hits(k, 60_000)).toBe(2);
  });
});

describe("токены", () => {
  it("случайные, 256 бит, в БД — только хэш", () => {
    const a = randomToken();
    expect(a).toHaveLength(43);
    expect(a).not.toBe(randomToken());
    expect(sha256(a)).toHaveLength(64);
    expect(safeEqual(a, a)).toBe(true);
    expect(safeEqual(a, a + "x")).toBe(false);
  });
});

describe("вход через Google", () => {
  const ok = { sub: "1", email: "t@school.kz", email_verified: true, hd: "school.kz" };
  it("требует подтверждённый email", () => {
    expect(googleLoginProblem({ ...ok, email_verified: false }, ["TEACHER"], [])).toBe("email_unverified");
  });
  it("сотрудники и ученики — только со школьного домена", () => {
    expect(googleLoginProblem(ok, ["TEACHER"], ["school.kz"])).toBeNull();
    expect(googleLoginProblem({ ...ok, hd: undefined, email: "t@gmail.com" }, ["TEACHER"], ["school.kz"])).toBe("domain");
    expect(googleLoginProblem({ ...ok, hd: undefined, email: "s@gmail.com" }, ["STUDENT"], ["school.kz"])).toBe("domain");
  });
  it("родители — с любого подтверждённого Gmail", () => {
    expect(googleLoginProblem({ ...ok, hd: undefined, email: "mama@gmail.com" }, ["GUARDIAN"], ["school.kz"])).toBeNull();
  });
});

describe("валидация", () => {
  it("UUID", () => {
    expect(isUuid("d62a3602-13f0-45eb-add9-636696bdc343")).toBe(true);
    expect(isUuid("1 OR 1=1")).toBe(false);
  });
});
