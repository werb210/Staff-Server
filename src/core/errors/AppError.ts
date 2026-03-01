export class AppError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(
    message: string,
    status = 500,
    code = "internal_error",
    details?: unknown
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;

    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(message: string, code = "bad_request", details?: unknown) {
    return new AppError(message, 400, code, details);
  }

  static unauthorized(message = "Unauthorized") {
    return new AppError(message, 401, "unauthorized");
  }

  static forbidden(message = "Forbidden") {
    return new AppError(message, 403, "forbidden");
  }

  static notFound(message = "Not found") {
    return new AppError(message, 404, "not_found");
  }
}
