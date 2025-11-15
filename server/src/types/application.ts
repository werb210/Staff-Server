import type { Silo } from "./silo.js";

interface ApplicationCore {
  id: string;
  silo: Silo;
  createdAt: Date;
  updatedAt: Date;
  userId?: string | null;
  applicantName?: string;
  email?: string;
  phone?: string;
  status?: string;
  loanAmount?: number;
  assignedTo?: string | null;
  tags?: string[];
}

export type ApplicationRecord = ApplicationCore & Record<string, unknown>;
