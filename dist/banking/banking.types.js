import { z } from "zod";
export const BankingReprocessSchema = z.object({
    applicationId: z.string().uuid(),
    documentVersionIds: z.array(z.string().uuid()).min(1),
});
