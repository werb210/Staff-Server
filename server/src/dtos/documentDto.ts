// server/src/dtos/documentDto.ts
import { z } from "zod";

export const documentDto = z.object({
  applicationId: z.string().uuid(),
  name: z.string(),
  category: z.string(),
  mimeType: z.string(),
  size: z.number(),
  s3Key: z.string().optional(),
});

export type DocumentDto = z.infer<typeof documentDto>;
