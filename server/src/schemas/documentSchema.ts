import { z } from "zod";
import { logDebug, logInfo } from "../utils/logger.js";

export const DocumentSchema = z.object({
  id: z.string().min(1),
  applicationId: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(["pdf", "image", "text", "other"]),
  status: z.enum(["pending", "received", "processing", "rejected"]),
  uploadedAt: z.string()
});

export type DocumentSchemaType = z.infer<typeof DocumentSchema>;

export function parseDocument(data: unknown): DocumentSchemaType {
  logInfo("parseDocument invoked");
  const result = DocumentSchema.parse(data);
  logDebug("parseDocument result", { id: result.id, status: result.status });
  return result;
}
