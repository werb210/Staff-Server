import "express";

declare module "express-serve-static-core" {
  interface Request {
    user?: { id: string; email: string; role: import("../src/auth/auth.types").UserRole; sessionId?: string };
  }
}
