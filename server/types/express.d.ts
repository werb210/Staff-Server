/**
 * Custom Express type declarations for Boreal Staff-Server
 * Extends Request with authenticated user information.
 */

import { AuthenticatedUser } from "../src/auth/auth.types";

declare global {
  namespace Express {
    type UserAuth = AuthenticatedUser & { sessionId: string };

    interface Request {
      user?: UserAuth;
    }
  }
}

export {};
