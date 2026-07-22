import { handleApiRequest, readJsonBody } from "@/server/api-response";
import { services } from "@/server/container";

export async function POST(request: Request) {
  return handleApiRequest(async () => {
    const input = await readJsonBody(request);
    return services.calculations.create(input);
  }, 201);
}
