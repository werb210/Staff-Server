import { z } from "zod";
export const OcrRequestSchema = z.object({
    applicationId: z.string().uuid(),
    documentId: z.string().uuid(),
    documentVersionId: z.string().uuid(),
    blobKey: z.string().min(1),
});
