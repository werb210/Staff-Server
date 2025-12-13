import type { User } from "../auth/auth.types";

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export {};
