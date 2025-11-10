import type { DocumentRequirement } from "./documentRequirement.js";
import type { User } from "./user.js";

export interface Application {
  id: string;
  applicant: User;
  amountRequested: number;
  termMonths: number;
  status: "draft" | "submitted" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string;
  documents: DocumentRequirement[];
}
