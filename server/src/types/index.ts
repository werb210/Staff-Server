import { z } from "zod";
import {
  ApplicationCreateSchema,
  ApplicationStatusSchema,
  ApplicationUpdateSchema,
} from "../schemas/applicationSchemas.js";
import { DocumentStatusSchema, DocumentUploadSchema } from "../schemas/documentSchemas.js";
import { LenderProductSchema, LenderSchema } from "../schemas/lenderSchemas.js";
import { PipelineStageSchema, UserSchema } from "../schemas/userSchemas.js";

export type Application = z.infer<typeof ApplicationCreateSchema> & {
  id: string;
  status: z.infer<typeof ApplicationStatusSchema>;
  createdAt: string;
  updatedAt: string;
};

export type ApplicationUpdate = z.infer<typeof ApplicationUpdateSchema>;
export type Document = z.infer<typeof DocumentUploadSchema> & {
  id: string;
  status: z.infer<typeof DocumentStatusSchema>;
  url: string;
  uploadedAt: string;
};

export type LenderProduct = z.infer<typeof LenderProductSchema>;
export type Lender = z.infer<typeof LenderSchema>;
export type PipelineStage = z.infer<typeof PipelineStageSchema>;
export type User = z.infer<typeof UserSchema>;
