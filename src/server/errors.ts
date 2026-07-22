export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly headers?: HeadersInit,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function notFoundError(resourceName: string): AppError {
  return new AppError(
    "NOT_FOUND",
    `Không tìm thấy ${resourceName}.`,
    404,
  );
}
