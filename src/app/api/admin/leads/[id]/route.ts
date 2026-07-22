import {
  assertAdminMutationOrigin,
  requireAdminApi,
} from "@/server/admin-auth";
import {
  handleApiRequest,
  parseRouteId,
  readJsonBody,
} from "@/server/api-response";
import { services } from "@/server/container";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  return handleApiRequest(async () => {
    requireAdminApi(request);
    const { id } = await context.params;
    return services.leads.get(parseRouteId(id));
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  return handleApiRequest(async () => {
    requireAdminApi(request);
    assertAdminMutationOrigin(request);
    const [{ id }, input] = await Promise.all([
      context.params,
      readJsonBody(request),
    ]);
    return services.leads.updateStatus(parseRouteId(id), input);
  });
}
