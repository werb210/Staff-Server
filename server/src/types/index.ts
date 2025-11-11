import { z } from "zod";
import {
  ApplicationSchema,
  ApplicationCreateSchema,
  ApplicationStatusSchema,
  ApplicationPublicSchema,
} from "../schemas/application.schema.js";
import {
  DocumentMetadataSchema,
  DocumentUploadSchema,
  DocumentStatusSchema,
  DocumentStatusResponseSchema,
} from "../schemas/document.schema.js";
import {
  LenderSchema,
  LenderProductSchema,
  LenderReportSchema,
  LenderDocumentRequirementSchema,
} from "../schemas/lenderProduct.schema.js";
import { PipelineStageSchema } from "../schemas/pipeline.schema.js";
import { UserSchema } from "../schemas/user.schema.js";

export type Application = z.infer<typeof ApplicationSchema>;
export type ApplicationCreate = z.infer<typeof ApplicationCreateSchema>;
export type ApplicationStatus = z.infer<typeof ApplicationStatusSchema>;
export type ApplicationPublic = z.infer<typeof ApplicationPublicSchema>;

export type DocumentMetadata = z.infer<typeof DocumentMetadataSchema>;
export type DocumentUpload = z.infer<typeof DocumentUploadSchema>;
export type DocumentStatus = z.infer<typeof DocumentStatusSchema>;
export type DocumentStatusResponse = z.infer<typeof DocumentStatusResponseSchema>;

export type Lender = z.infer<typeof LenderSchema>;
export type LenderProduct = z.infer<typeof LenderProductSchema>;
export type LenderReport = z.infer<typeof LenderReportSchema>;
export type LenderDocumentRequirement = z.infer<
  typeof LenderDocumentRequirementSchema
>;

export type PipelineStage = z.infer<typeof PipelineStageSchema>;
export type User = z.infer<typeof UserSchema>;
