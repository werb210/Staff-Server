import { z } from "zod";
import { logDebug, logInfo } from "../utils/logger.js";

export const ApplicationSchema = z.object({
  id: z.string().min(1),
  applicantId: z.string().min(1),
  amountRequested: z.number().nonnegative(),
  termMonths: z.number().int().positive(),
  status: z.enum(["draft", "submitted", "approved", "rejected"]),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type ApplicationSchemaType = z.infer<typeof ApplicationSchema>;

export function parseApplication(data: unknown): ApplicationSchemaType {
  logInfo("parseApplication invoked");
  const result = ApplicationSchema.parse(data);
  logDebug("parseApplication result", { id: result.id, status: result.status });
  return result;
}
