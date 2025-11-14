import type { JwtUserPayload } from "../auth/authService.js";
import type { Silo } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      silo?: Silo;
      user?: JwtUserPayload;
    }
  }
}

export {};
