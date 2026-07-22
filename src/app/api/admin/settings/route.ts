import {
  assertAdminMutationOrigin,
  requireAdminApi,
} from "@/server/admin-auth";
import { handleApiRequest, readJsonBody } from "@/server/api-response";
import { services } from "@/server/container";

export async function GET(request: Request) {
  return handleApiRequest(async () => {
    requireAdminApi(request);
    return services.settings.get();
  });
}

export async function PATCH(request: Request) {
  return handleApiRequest(async () => {
    requireAdminApi(request);
    assertAdminMutationOrigin(request);
    return services.settings.update(await readJsonBody(request));
  });
}
