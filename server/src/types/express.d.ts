// server/src/types/express.d.ts
import "express";
import type { Role, SiloAccess } from "./user.js";

declare module "express-serve-static-core" {
  interface Request {
    user?: {
      id: string;
      email: string;
      siloAccess: SiloAccess;
      roles: Role[];
      createdAt?: string | Date;
      updatedAt?: string | Date;
    };
  }
}
