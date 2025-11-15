import type { Silo } from "./silo.js";

export type Stage =
  | "lead"
  | "application"
  | "processing"
  | "underwriting"
  | "approved"
  | "closed"
  | "archived"
  | string;

interface PipelineCore {
  id: string;
  silo: Silo;
  appId: string;
  stage: Stage;
  createdAt: Date;
  updatedAt: Date;
  assignedTo?: string | null;
  notes?: string | null;
}

export type PipelineRecord = PipelineCore & Record<string, unknown>;
