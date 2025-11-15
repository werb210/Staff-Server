import type { Buffer } from "node:buffer";
import type { Silo } from "./silo.js";

interface DocumentCore {
  id: string;
  silo: Silo;
  applicationId: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  content?: Buffer;
  createdAt: Date;
  updatedAt: Date;
  accepted?: boolean;
  acceptedBy?: string | null;
  rejected?: boolean;
  rejectedBy?: string | null;
  uploadedBy?: string | null;
  notes?: string | null;
}

export type DocumentRecord = DocumentCore & Record<string, unknown>;
