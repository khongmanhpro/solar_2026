import {
  assertAdminMutationOrigin,
  requireAdminApi,
} from "@/server/admin-auth";
import { handleApiRequest, parseRouteId } from "@/server/api-response";
import { services } from "@/server/container";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  return handleApiRequest(async () => {
    requireAdminApi(request);
    assertAdminMutationOrigin(request);
    const { id } = await context.params;
    return services.packages.disable(parseRouteId(id));
  });
}
