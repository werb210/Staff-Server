import { type PipelineState } from "./pipelineState";

export type DocumentRequirement = {
  documentType: string;
  required: boolean;
  multipleAllowed: boolean;
  category: DocumentCategory;
};

export type DocumentCategory = "identity" | "financial" | "legal" | "other";

const DEFAULT_REQUIREMENTS: Record<PipelineState, DocumentRequirement[]> = {
  NEW: [
    {
      documentType: "bank_statement",
      required: true,
      multipleAllowed: true,
      category: "financial",
    },
    {
      documentType: "id_document",
      required: true,
      multipleAllowed: false,
      category: "identity",
    },
  ],
  REQUIRES_DOCS: [
    {
      documentType: "bank_statement",
      required: true,
      multipleAllowed: true,
      category: "financial",
    },
    {
      documentType: "id_document",
      required: true,
      multipleAllowed: false,
      category: "identity",
    },
  ],
  UNDER_REVIEW: [
    {
      documentType: "bank_statement",
      required: true,
      multipleAllowed: true,
      category: "financial",
    },
    {
      documentType: "id_document",
      required: true,
      multipleAllowed: false,
      category: "identity",
    },
  ],
  LENDER_SUBMITTED: [
    {
      documentType: "bank_statement",
      required: true,
      multipleAllowed: true,
      category: "financial",
    },
    {
      documentType: "id_document",
      required: true,
      multipleAllowed: false,
      category: "identity",
    },
  ],
  APPROVED: [
    {
      documentType: "bank_statement",
      required: true,
      multipleAllowed: true,
      category: "financial",
    },
    {
      documentType: "id_document",
      required: true,
      multipleAllowed: false,
      category: "identity",
    },
  ],
  DECLINED: [
    {
      documentType: "bank_statement",
      required: true,
      multipleAllowed: true,
      category: "financial",
    },
    {
      documentType: "id_document",
      required: true,
      multipleAllowed: false,
      category: "identity",
    },
  ],
  FUNDED: [
    {
      documentType: "bank_statement",
      required: true,
      multipleAllowed: true,
      category: "financial",
    },
    {
      documentType: "id_document",
      required: true,
      multipleAllowed: false,
      category: "identity",
    },
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

export function isSupportedProductType(productType: string): boolean {
  return Boolean(REQUIREMENTS_BY_PRODUCT[productType]);
}

export function getAllowedDocumentTypes(productType: string): string[] {
  const productRequirements =
    REQUIREMENTS_BY_PRODUCT[productType] ?? DEFAULT_REQUIREMENTS;
  const types = new Set<string>();
  Object.values(productRequirements).forEach((requirements) => {
    requirements.forEach((requirement) => types.add(requirement.documentType));
  });
  return [...types];
}

export function getDocumentCategory(
  productType: string,
  documentType: string
): DocumentCategory | null {
  const productRequirements =
    REQUIREMENTS_BY_PRODUCT[productType] ?? DEFAULT_REQUIREMENTS;
  for (const requirements of Object.values(productRequirements)) {
    const match = requirements.find(
      (requirement) => requirement.documentType === documentType
    );
    if (match) {
      return match.category;
    }
  }
  return null;
}
