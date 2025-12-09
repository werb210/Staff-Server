export type UserRole = "Admin" | "Staff" | "Lender" | "Referrer";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  sessionId: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: Date;
  refreshExpiresAt: Date;
  sessionId: string;
}

export interface LoginRequestBody {
  email: string;
  password: string;
  portal?: "lender" | "referrer" | "staff";
}

export interface LoginResult {
  user: AuthenticatedUser;
  tokens: TokenPair;
}

export interface RefreshResult {
  tokens: TokenPair;
  user: AuthenticatedUser;
}

export interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
}
