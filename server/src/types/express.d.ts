import type { User, Silo } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      silo?: Silo;
      user?: User;
    }
  }
}

export {};
