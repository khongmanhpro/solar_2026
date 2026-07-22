import { requireAdminApi } from "@/server/admin-auth";
import { handleApiRequest } from "@/server/api-response";
import { services } from "@/server/container";

export async function GET(request: Request) {
  return handleApiRequest(async () => {
    requireAdminApi(request);
    return services.leads.list();
  });
}
