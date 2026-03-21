import "express";
import { type AuthenticatedUser } from "./auth";

declare module "express-serve-static-core" {
  interface Request {
    id: string;
    requestId?: string;
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
