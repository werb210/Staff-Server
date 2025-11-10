import { z } from "zod";
import { logDebug, logInfo } from "../utils/logger.js";

export const UserSchema = z.object({
  id: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(7),
  role: z.enum(["applicant", "loan-officer", "admin"]),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type UserSchemaType = z.infer<typeof UserSchema>;

export function parseUser(data: unknown): UserSchemaType {
  logInfo("parseUser invoked");
  const result = UserSchema.parse(data);
  logDebug("parseUser result", { id: result.id, email: result.email });
  return result;
}
