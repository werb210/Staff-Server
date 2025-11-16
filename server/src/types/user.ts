// server/src/types/user.ts

/**
 * A Silo represents an access-scope tag applied to a user.
 * In your current database, these are stored as simple strings (e.g., "BF", "SLF").
 */
export type Silo = string;

/**
 * Raw internal user object returned from Prisma and used inside the backend.
 * Includes passwordHash so NEVER send this to the client.
 */
export interface User {
  id: string;
  email: string;
  role: string;
  silos: Silo[];          // Stored as string[]
  name: string;           // Always normalized to a non-empty string
  createdAt: Date;
  updatedAt: Date;
}

/**
 * The version of User that is persisted AND still includes passwordHash.
 * This is what authService returns BEFORE sanitization.
 */
export interface StoredUser extends User {
  passwordHash: string;
}

/**
 * Public version of a user sent to the client.
 * EXCLUDES passwordHash entirely.
 */
export interface PublicUser {
  id: string;
  email: string;
  role: string;
  silos: Silo[];
  name: string;
  createdAt: Date;
  updatedAt: Date;
}
