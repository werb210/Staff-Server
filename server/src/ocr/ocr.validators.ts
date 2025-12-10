import { z } from "zod";
import { OcrRequestSchema } from "./ocr.types";

export const OcrReprocessSchema = OcrRequestSchema;

export const OcrResultsQuerySchema = z.object({
  applicationId: z.string().uuid(),
});
