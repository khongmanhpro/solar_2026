import { afterEach, describe, expect, it } from "vitest";

import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_TTL_SECONDS,
  assertAdminMutationOrigin,
  authenticateAdminCredentials,
  createAdminSessionToken,
  requireAdminApi,
  verifyAdminSessionToken,
} from "@/server/admin-auth";
import { handleApiRequest, readJsonBody } from "@/server/api-response";

const originalUsername = process.env.ADMIN_USERNAME;
const originalPassword = process.env.ADMIN_PASSWORD;
const originalSessionSecret = process.env.ADMIN_SESSION_SECRET;

afterEach(() => {
  process.env.ADMIN_USERNAME = originalUsername;
  process.env.ADMIN_PASSWORD = originalPassword;
  process.env.ADMIN_SESSION_SECRET = originalSessionSecret;
});

describe("admin API auth", () => {
  it("xác thực credentials từ biến môi trường", () => {
    process.env.ADMIN_USERNAME = "admin-test";
    process.env.ADMIN_PASSWORD = "strong-password";
    process.env.ADMIN_SESSION_SECRET = "unit-test-session-secret-at-least-32-characters";

    expect(
      authenticateAdminCredentials({
        username: "admin-test",
        password: "strong-password",
      }),
    ).toBe("admin-test");
    expect(() =>
      authenticateAdminCredentials({
        username: "admin-test",
        password: "wrong",
      }),
    ).toThrow();
  });

  it("chấp nhận cookie phiên ký đúng, từ chối token giả và token hết hạn", () => {
    process.env.ADMIN_USERNAME = "admin-test";
    process.env.ADMIN_PASSWORD = "strong-password";
    process.env.ADMIN_SESSION_SECRET = "unit-test-session-secret-at-least-32-characters";
    const now = Date.now();
    const token = createAdminSessionToken("admin-test", now);

    expect(() =>
      requireAdminApi(
        new Request("http://localhost/api/admin/packages", {
          headers: { cookie: `${ADMIN_SESSION_COOKIE}=${token}` },
        }),
      ),
    ).not.toThrow();
    expect(verifyAdminSessionToken(`${token}tampered`, now)).toBeNull();
    expect(
      verifyAdminSessionToken(
        token,
        now + ADMIN_SESSION_TTL_SECONDS * 1_000 + 1,
      ),
    ).toBeNull();
  });

  it("chặn mutation có Origin khác host", () => {
    expect(() =>
      assertAdminMutationOrigin(
        new Request("https://solar.test/api/admin/settings", {
          method: "PATCH",
          headers: { origin: "https://attacker.test" },
        }),
      ),
    ).toThrow();
    expect(() =>
      assertAdminMutationOrigin(
        new Request("https://solar.test/api/admin/settings", {
          method: "PATCH",
          headers: { origin: "https://solar.test" },
        }),
      ),
    ).not.toThrow();
  });
});

describe("API response", () => {
  it("chuẩn hóa lỗi validation mà không lộ stack trace", async () => {
    const response = await handleApiRequest(async () => {
      throw new Error("sensitive internal detail");
    });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe("INTERNAL_SERVER_ERROR");
    expect(body.error.message).not.toContain("sensitive internal detail");
  });

  it("từ chối JSON không hợp lệ", async () => {
    const request = new Request("http://localhost/api/calculations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{invalid-json",
    });
    const response = await handleApiRequest(() => readJsonBody(request));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("INVALID_JSON");
  });
});
