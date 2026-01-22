import { type Capability } from "../auth/capabilities";
import { type Role } from "../auth/roles";

export interface AuthenticatedUser {
  userId: string;
  role: Role;
  silo: string;
  siloFromToken: boolean;
  phone?: string | null;
  capabilities: Capability[];
}
