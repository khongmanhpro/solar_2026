import {
  ADMIN_SESSION_COOKIE,
  assertLoginAllowed,
  authenticateAdminCredentials,
  clearLoginFailures,
  createAdminSessionToken,
  getAdminSessionCookieOptions,
  getLoginRateLimitKey,
  recordLoginFailure,
} from "@/server/admin-auth";
import { handleApiRequest, readJsonBody } from "@/server/api-response";

export async function POST(request: Request) {
  let sessionToken: string | undefined;

  const response = await handleApiRequest(async () => {
    const rateLimitKey = getLoginRateLimitKey(request);
    assertLoginAllowed(rateLimitKey);

    try {
      const username = authenticateAdminCredentials(await readJsonBody(request));
      sessionToken = createAdminSessionToken(username);
      clearLoginFailures(rateLimitKey);
      return { authenticated: true };
    } catch (error) {
      recordLoginFailure(rateLimitKey);
      throw error;
    }
  });

  if (response.ok && sessionToken) {
    response.cookies.set(
      ADMIN_SESSION_COOKIE,
      sessionToken,
      getAdminSessionCookieOptions(),
    );
  }

  return response;
}
