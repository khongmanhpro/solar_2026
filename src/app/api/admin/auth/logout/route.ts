import {
  ADMIN_SESSION_COOKIE,
  assertAdminMutationOrigin,
  getAdminSessionCookieOptions,
  requireAdminApi,
} from "@/server/admin-auth";
import { handleApiRequest } from "@/server/api-response";

export async function POST(request: Request) {
  const response = await handleApiRequest(async () => {
    requireAdminApi(request);
    assertAdminMutationOrigin(request);
    return { authenticated: false };
  });

  if (response.ok) {
    response.cookies.set(ADMIN_SESSION_COOKIE, "", {
      ...getAdminSessionCookieOptions(),
      maxAge: 0,
    });
  }

  return response;
}
