import { ApiError } from "../core/errors/ApiError";

export class AppError extends ApiError {
  constructor(code: string, status = 500, message?: string) {
    super(status, code, message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
