export type OcrInsightFieldSource = {
  documentId: string;
  documentType: string | null;
  page: number | null;
};

export type OcrInsightField = {
  value: string;
  confidence: number;
  sources: OcrInsightFieldSource[];
};

export type OcrInsightsResponse = {
  fields: Record<string, OcrInsightField>;
  missingFields: string[];
  conflictingFields: string[];
  warnings: string[];
  groupedByDocumentType: Record<string, Record<string, OcrInsightField>>;
  groupedByFieldCategory: Record<string, Record<string, OcrInsightField>>;
};

export type ApplicationResponse = {
  id: string;
  ownerUserId: string | null;
  name: string;
  metadata: unknown | null;
  productType: string;
  pipelineState: string;
  lenderId: string | null;
  lenderProductId: string | null;
  requestedAmount: number | null;
  createdAt: Date;
  updatedAt: Date;
  ocrInsights: OcrInsightsResponse;
};
