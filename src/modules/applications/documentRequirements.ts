import { type PipelineState } from "./pipelineState";

export type DocumentRequirement = {
  documentType: string;
  required: boolean;
  multipleAllowed: boolean;
};

const DEFAULT_REQUIREMENTS: Record<PipelineState, DocumentRequirement[]> = {
  NEW: [
    { documentType: "bank_statement", required: true, multipleAllowed: true },
    { documentType: "id_document", required: true, multipleAllowed: false },
  ],
  REQUIRES_DOCS: [
    { documentType: "bank_statement", required: true, multipleAllowed: true },
    { documentType: "id_document", required: true, multipleAllowed: false },
  ],
  UNDER_REVIEW: [
    { documentType: "bank_statement", required: true, multipleAllowed: true },
    { documentType: "id_document", required: true, multipleAllowed: false },
  ],
  LENDER_SUBMITTED: [
    { documentType: "bank_statement", required: true, multipleAllowed: true },
    { documentType: "id_document", required: true, multipleAllowed: false },
  ],
  APPROVED: [
    { documentType: "bank_statement", required: true, multipleAllowed: true },
    { documentType: "id_document", required: true, multipleAllowed: false },
  ],
  DECLINED: [
    { documentType: "bank_statement", required: true, multipleAllowed: true },
    { documentType: "id_document", required: true, multipleAllowed: false },
  ],
  FUNDED: [
    { documentType: "bank_statement", required: true, multipleAllowed: true },
    { documentType: "id_document", required: true, multipleAllowed: false },
  ],
};

const REQUIREMENTS_BY_PRODUCT: Record<
  string,
  Record<PipelineState, DocumentRequirement[]>
> = {
  standard: DEFAULT_REQUIREMENTS,
};

export function getRequirements(params: {
  productType: string;
  pipelineState: PipelineState;
}): DocumentRequirement[] {
  const productRequirements =
    REQUIREMENTS_BY_PRODUCT[params.productType] ?? DEFAULT_REQUIREMENTS;
  return productRequirements[params.pipelineState] ?? [];
}
