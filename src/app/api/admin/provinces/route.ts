import {
  assertAdminMutationOrigin,
  requireAdminApi,
} from "@/server/admin-auth";
import { handleApiRequest, readJsonBody } from "@/server/api-response";
import { services } from "@/server/container";

export async function GET(request: Request) {
  return handleApiRequest(async () => {
    requireAdminApi(request);
    return services.provinces.list();
  });
}

export async function POST(request: Request) {
  return handleApiRequest(async () => {
    requireAdminApi(request);
    assertAdminMutationOrigin(request);
    return services.provinces.create(await readJsonBody(request));
  }, 201);
}
