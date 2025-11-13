import { z } from "zod";
import { AllSilos } from "../silos/siloTypes.js";

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum(["admin", "staff", "marketing", "lender", "referrer"]),
  // Admin must select silos at creation
  silos: z.array(z.enum(AllSilos)).min(1)
});

export type User = z.infer<typeof UserSchema>;
