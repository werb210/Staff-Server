// server/src/services/applicationTypes.ts

export interface Application {
  id: string;
  name: string;
  status: "new" | "in_review" | "completed";
  createdAt: number;
}
