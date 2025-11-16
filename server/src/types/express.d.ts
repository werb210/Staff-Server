// server/src/types/express.d.ts

import type { User } from "./user";

declare global {
  namespace Express {
    interface Request {
      user?: User | null;
    }
  }
}

export {};
