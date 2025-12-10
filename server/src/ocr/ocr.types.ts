import { z } from "zod";

export const OcrRequestSchema = z.object({
  applicationId: z.string().uuid(),
  documentId: z.string().uuid(),
  documentVersionId: z.string().uuid(),
  blobKey: z.string().min(1),
});

export type OcrRequest = z.infer<typeof OcrRequestSchema> & { userId?: string };

export interface OcrGlobalFields {
  sinOrSsn?: string[];
  websiteUrls?: string[];
  phoneNumbers?: string[];
  emails?: string[];
  legalNames?: string[];
  addresses?: string[];
}

export type OcrCategory =
  | "balance_sheet"
  | "income_statement"
  | "cash_flow"
  | "taxes"
  | "contracts"
  | "invoices";

export interface OcrExtractedJson {
  rawText: string;
  categories: Partial<Record<OcrCategory, string>>;
  globalFields: OcrGlobalFields;
}

export interface OcrConflictField {
  field: keyof OcrGlobalFields;
  values: string[];
}

export interface OcrResultRecord {
  id: string;
  applicationId: string;
  documentId: string;
  documentVersionId: string;
  extractedJson: OcrExtractedJson;
  categoriesDetected: OcrCategory[];
  conflictingFields: OcrConflictField[];
  createdAt: Date;
}
