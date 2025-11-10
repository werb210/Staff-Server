export interface DocumentRequirement {
  id: string;
  name: string;
  description: string;
  required: boolean;
  status: "pending" | "received" | "processing" | "rejected";
}
