export type OcrFieldDefinition = {
  name: string;
  required: boolean;
  documentTypes: string[];
};

export const OCR_FIELD_REGISTRY: OcrFieldDefinition[] = [
  {
    name: "business_name",
    required: true,
    documentTypes: ["financial_statement", "tax_return", "bank_statement"],
  },
  {
    name: "tax_id",
    required: true,
    documentTypes: ["tax_return", "financial_statement"],
  },
  {
    name: "owner_name",
    required: true,
    documentTypes: ["id_document", "tax_return"],
  },
  {
    name: "business_address",
    required: false,
    documentTypes: ["bank_statement", "financial_statement"],
  },
  {
    name: "phone",
    required: false,
    documentTypes: ["bank_statement", "tax_return", "financial_statement"],
  },
  {
    name: "email",
    required: false,
    documentTypes: ["tax_return", "financial_statement"],
  },
];

export function getOcrFieldDefinitions(): OcrFieldDefinition[] {
  return [...OCR_FIELD_REGISTRY];
}

export function getOcrFieldsForDocumentType(
  documentType: string
): OcrFieldDefinition[] {
  const normalized = documentType.trim().toLowerCase();
  return OCR_FIELD_REGISTRY.filter((field) =>
    field.documentTypes.some((docType) => docType.toLowerCase() === normalized)
  );
}
