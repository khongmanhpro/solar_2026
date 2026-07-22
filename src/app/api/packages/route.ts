import { handleApiRequest } from "@/server/api-response";
import { services } from "@/server/container";

export async function GET() {
  return handleApiRequest(() => services.packages.list(true));
}
