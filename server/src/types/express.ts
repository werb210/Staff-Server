import type { JwtUserPayload, Silo } from "../types/index.js";

declare global {
  namespace Express {
    interface Request {
      silo?: Silo;
      user?: JwtUserPayload;
    }
  }
}

export {};
