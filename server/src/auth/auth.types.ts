export type UserRole = "Admin" | "Staff" | "Lender" | "Referrer";
export type UserStatus = "active" | "inactive" | "locked";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  firstName?: string;
  lastName?: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}
