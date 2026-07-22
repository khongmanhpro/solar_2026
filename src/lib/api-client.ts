interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface ApiErrorPayload {
  error?: {
    code?: string;
    message?: string;
    issues?: Array<{ path: string; message: string }>;
  };
}

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly issues: Array<{ path: string; message: string }>;

  constructor(
    message: string,
    options: {
      status: number;
      code?: string;
      issues?: Array<{ path: string; message: string }>;
    },
  ) {
    super(message);
    this.name = "ApiClientError";
    this.status = options.status;
    this.code = options.code ?? "REQUEST_FAILED";
    this.issues = options.issues ?? [];
  }
}

export async function requestJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(input, init);
  } catch {
    throw new ApiClientError(
      "Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.",
      { status: 0, code: "NETWORK_ERROR" },
    );
  }

  const payload = (await response.json().catch(() => null)) as
    | ApiSuccess<T>
    | ApiErrorPayload
    | null;

  if (!response.ok || !payload || !("success" in payload)) {
    const error = payload && "error" in payload ? payload.error : undefined;
    throw new ApiClientError(
      error?.message ?? "Yêu cầu chưa được xử lý. Vui lòng thử lại.",
      {
        status: response.status,
        code: error?.code,
        issues: error?.issues,
      },
    );
  }

  return payload.data;
}
