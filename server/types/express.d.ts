/**
 * Custom Express type declarations for Boreal Staff-Server
 * Extends Request with authenticated user information.
 */

import { UserRole } from "../src/auth/types";

declare global {
  namespace Express {
    interface UserAuth {
      id: string;
      email: string;
      role: UserRole;
    }

    interface Request {
      user?: UserAuth;
    }
  }
}

export {};
