import type { User } from "../db/schema";

declare global {
  namespace Express {
    interface Request {
      user?: User & {
        sessionId?: string;
      };
    }
  }
}

export {};
