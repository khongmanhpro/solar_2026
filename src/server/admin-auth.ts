import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { AppError } from "@/server/errors";

export const ADMIN_SESSION_COOKIE = "solar_admin_session";
export const ADMIN_SESSION_TTL_SECONDS = 8 * 60 * 60;

const SESSION_VERSION = "v1";
const LOGIN_WINDOW_MS = 15 * 60 * 1_000;
const MAX_LOGIN_FAILURES = 5;

interface AdminSessionPayload {
  sub: "solar-admin";
  username: string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
}

interface LoginAttempt {
  failures: number;
  windowStartedAt: number;
}

const loginAttempts = new Map<string, LoginAttempt>();

export const adminCredentialsSchema = z
  .object({
    username: z.string().trim().min(1, "Vui lòng nhập tài khoản.").max(100),
    password: z.string().min(1, "Vui lòng nhập mật khẩu.").max(500),
  })
  .strict();

function getAdminConfig() {
  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    throw new AppError(
      "ADMIN_NOT_CONFIGURED",
      "Tài khoản quản trị chưa được cấu hình.",
      503,
    );
  }

  return { username, password };
}

function getSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET?.trim();

  if (secret) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new AppError(
      "ADMIN_SESSION_NOT_CONFIGURED",
      "Khóa phiên quản trị chưa được cấu hình.",
      503,
    );
  }

  const { username, password } = getAdminConfig();
  return `development-only:${username}:${password}:solar-admin-session`;
}

function safeEqual(first: string, second: string): boolean {
  const firstDigest = createHash("sha256").update(first).digest();
  const secondDigest = createHash("sha256").update(second).digest();
  return timingSafeEqual(firstDigest, secondDigest);
}

function sign(value: string): string {
  return createHmac("sha256", getSessionSecret())
    .update(value)
    .digest("base64url");
}

export function createAdminSessionToken(
  username: string,
  now = Date.now(),
): string {
  const payload: AdminSessionPayload = {
    sub: "solar-admin",
    username,
    issuedAt: now,
    expiresAt: now + ADMIN_SESSION_TTL_SECONDS * 1_000,
    nonce: randomBytes(16).toString("base64url"),
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url",
  );
  const unsignedToken = `${SESSION_VERSION}.${encodedPayload}`;

  return `${unsignedToken}.${sign(unsignedToken)}`;
}

export function verifyAdminSessionToken(
  token: string | undefined,
  now = Date.now(),
): AdminSessionPayload | null {
  if (!token) return null;

  const [version, encodedPayload, signature, ...extra] = token.split(".");

  if (
    version !== SESSION_VERSION ||
    !encodedPayload ||
    !signature ||
    extra.length > 0
  ) {
    return null;
  }

  const unsignedToken = `${version}.${encodedPayload}`;
  if (!safeEqual(signature, sign(unsignedToken))) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as Partial<AdminSessionPayload>;
    const { username } = getAdminConfig();

    if (
      payload.sub !== "solar-admin" ||
      typeof payload.username !== "string" ||
      !safeEqual(payload.username, username) ||
      typeof payload.issuedAt !== "number" ||
      typeof payload.expiresAt !== "number" ||
      typeof payload.nonce !== "string" ||
      payload.issuedAt > now + 60_000 ||
      payload.expiresAt <= now
    ) {
      return null;
    }

    return payload as AdminSessionPayload;
  } catch {
    return null;
  }
}

export function authenticateAdminCredentials(rawInput: unknown): string {
  const input = adminCredentialsSchema.parse(rawInput);
  const expected = getAdminConfig();

  if (
    !safeEqual(input.username, expected.username) ||
    !safeEqual(input.password, expected.password)
  ) {
    throwUnauthorized();
  }

  return expected.username;
}

export function getAdminSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: ADMIN_SESSION_TTL_SECONDS,
  };
}

export function requireAdminApi(request: Request): AdminSessionPayload {
  const token = readCookie(request.headers.get("cookie"), ADMIN_SESSION_COOKIE);
  const session = verifyAdminSessionToken(token);

  if (!session) throwUnauthorized();
  return session;
}

export function assertAdminMutationOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) return;

  if (origin !== new URL(request.url).origin) {
    throw new AppError(
      "INVALID_ORIGIN",
      "Nguồn gửi yêu cầu quản trị không hợp lệ.",
      403,
    );
  }
}

export async function requireAdminPage() {
  const cookieStore = await cookies();
  const session = verifyAdminSessionToken(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
  );

  if (!session) redirect("/admin/login");
  return session;
}

export async function getOptionalAdminPageSession() {
  const cookieStore = await cookies();
  return verifyAdminSessionToken(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
  );
}

export function getLoginRateLimitKey(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "local"
  );
}

export function assertLoginAllowed(key: string, now = Date.now()): void {
  const attempt = loginAttempts.get(key);

  if (!attempt) return;
  if (now - attempt.windowStartedAt >= LOGIN_WINDOW_MS) {
    loginAttempts.delete(key);
    return;
  }

  if (attempt.failures >= MAX_LOGIN_FAILURES) {
    throw new AppError(
      "TOO_MANY_LOGIN_ATTEMPTS",
      "Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau 15 phút.",
      429,
      { "Retry-After": String(Math.ceil((LOGIN_WINDOW_MS - (now - attempt.windowStartedAt)) / 1_000)) },
    );
  }
}

export function recordLoginFailure(key: string, now = Date.now()): void {
  const attempt = loginAttempts.get(key);

  if (!attempt || now - attempt.windowStartedAt >= LOGIN_WINDOW_MS) {
    loginAttempts.set(key, { failures: 1, windowStartedAt: now });
    return;
  }

  attempt.failures += 1;
}

export function clearLoginFailures(key: string): void {
  loginAttempts.delete(key);
}

export function resetLoginRateLimitsForTests(): void {
  loginAttempts.clear();
}

function readCookie(header: string | null, name: string): string | undefined {
  return header
    ?.split(";")
    .map((part) => part.trim().split("="))
    .find(([cookieName]) => cookieName === name)
    ?.slice(1)
    .join("=");
}

function throwUnauthorized(): never {
  throw new AppError(
    "UNAUTHORIZED",
    "Phiên đăng nhập quản trị không hợp lệ hoặc đã hết hạn.",
    401,
  );
}
