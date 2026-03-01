export class AppError extends Error {
  public code: string;
  public status: number;

  constructor(code: string, status = 500, message?: string) {
    super(message ?? code);
    this.code = code;
    this.status = status;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
