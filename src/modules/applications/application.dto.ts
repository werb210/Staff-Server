export type OcrInsightFieldSource = {
  documentId: string;
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
