import { hash, verify } from "@node-rs/argon2";

// argon2id, параметры по рекомендации OWASP (19 MiB, 2 итерации)
const OPTS = { memoryCost: 19456, timeCost: 2, parallelism: 1, algorithm: 2 as const };

export const hashPassword = (password: string) => hash(password, OPTS);

/** Хэш-заглушка: проверка выполняется даже для несуществующего email, чтобы время ответа не выдавало, есть ли пользователь. */
let dummyHash: Promise<string> | null = null;
export async function verifyPassword(passwordHash: string | null | undefined, password: string) {
  if (!passwordHash) {
    dummyHash ??= hash("dummy-password-for-timing", OPTS);
    await verify(await dummyHash, password).catch(() => false);
    return false;
  }
  return verify(passwordHash, password).catch(() => false);
}

const COMMON = new Set(["password", "password1", "qwerty123", "1234567890", "123456789", "qwertyuiop", "11111111111", "parol12345", "school2026", "admin12345"]);

export const PASSWORD_ERRORS = {
  short: "Пароль должен быть не короче 10 символов",
  long: "Пароль слишком длинный",
  common: "Этот пароль слишком распространён",
  email: "Пароль не должен содержать имя из email",
  variety: "В пароле слишком мало разных символов",
} as const;
export type PasswordError = keyof typeof PASSWORD_ERRORS;

/** Политика пароля: длина важнее «сложности» (NIST SP 800-63B). Возвращает код ошибки или null. */
export function passwordProblem(password: string, email: string): PasswordError | null {
  if (password.length < 10) return "short";
  if (password.length > 200) return "long";
  const lower = password.toLowerCase();
  if (COMMON.has(lower)) return "common";
  const local = email.split("@")[0].toLowerCase();
  if (local.length >= 4 && lower.includes(local)) return "email";
  if (new Set(password).size < 5) return "variety";
  return null;
}
