import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AppError } from "@/server/errors";

const MAX_JSON_BODY_BYTES = 1_000_000;

export async function readJsonBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().includes("application/json")) {
    throw new AppError(
      "UNSUPPORTED_MEDIA_TYPE",
      "Content-Type phải là application/json.",
      415,
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);

  if (contentLength > MAX_JSON_BODY_BYTES) {
    throw new AppError(
      "PAYLOAD_TOO_LARGE",
      "Dữ liệu gửi lên vượt quá giới hạn cho phép.",
      413,
    );
  }

  try {
    const rawBody = await request.text();

    if (Buffer.byteLength(rawBody, "utf8") > MAX_JSON_BODY_BYTES) {
      throw new AppError(
        "PAYLOAD_TOO_LARGE",
        "Dữ liệu gửi lên vượt quá giới hạn cho phép.",
        413,
      );
    }

    return JSON.parse(rawBody) as unknown;
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    throw new AppError("INVALID_JSON", "Dữ liệu JSON không hợp lệ.", 400);
  }
}

export function parseRouteId(id: string): string {
  const normalizedId = id.trim();

  if (!normalizedId) {
    throw new AppError("INVALID_ID", "ID không hợp lệ.", 400);
  }

  return normalizedId;
}

function errorResponse(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status, headers: error.headers },
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Dữ liệu gửi lên không hợp lệ.",
          issues: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
      },
      { status: 422 },
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return NextResponse.json(
        {
          error: {
            code: "CONFLICT",
            message: "Dữ liệu đã tồn tại.",
          },
        },
        { status: 409 },
      );
    }

    if (error.code === "P2025") {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Không tìm thấy dữ liệu cần thao tác.",
          },
        },
        { status: 404 },
      );
    }

    if (error.code === "P2003") {
      return NextResponse.json(
        {
          error: {
            code: "REFERENCE_CONFLICT",
            message: "Dữ liệu đang được tham chiếu và không thể thay đổi.",
          },
        },
        { status: 409 },
      );
    }
  }

  console.error("Unhandled API error:", error);
  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Đã xảy ra lỗi máy chủ. Vui lòng thử lại sau.",
      },
    },
    { status: 500 },
  );
}

export async function handleApiRequest<T>(
  operation: () => Promise<T>,
  status = 200,
): Promise<NextResponse> {
  try {
    const data = await operation();
    return NextResponse.json({ success: true, data }, { status });
  } catch (error: unknown) {
    return errorResponse(error);
  }
}
