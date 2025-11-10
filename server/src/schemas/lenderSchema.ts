import { z } from "zod";
import { logDebug, logInfo } from "../utils/logger.js";

export const LenderSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(7),
  rating: z.number().min(0).max(5),
  active: z.boolean()
});

export type LenderSchemaType = z.infer<typeof LenderSchema>;

export function parseLender(data: unknown): LenderSchemaType {
  logInfo("parseLender invoked");
  const result = LenderSchema.parse(data);
  logDebug("parseLender result", { id: result.id, active: result.active });
  return result;
}
