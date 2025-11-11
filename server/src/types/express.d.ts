import type { SiloContext, AuthSession } from "../silos/types.js";

declare global {
  namespace Express {
    interface Request {
      silo?: SiloContext;
      session?: AuthSession;
    }
  }
}
