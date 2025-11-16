// server/src/types/user.ts

export interface User {
  id: string;
  email: string;
  role: "admin" | "staff" | "lender" | "referrer";
  createdAt: string;
}
