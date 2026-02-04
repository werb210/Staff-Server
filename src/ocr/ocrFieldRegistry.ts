export type OcrFieldCategory =
  | "balance_sheet"
  | "income_statement"
  | "cash_flow"
  | "taxes"
  | "ar"
  | "ap"
  | "inventory"
  | "equipment"
  | "contracts"
  | "general";

export type OcrFieldDefinition = {
  key: string;
  label: string;
  category: OcrFieldCategory;
  required: boolean;
  warnIfMissing: boolean;
  warnIfConflicting: boolean;
};

export const OCR_FIELD_REGISTRY: OcrFieldDefinition[] = [
  {
    key: "business_name",
    label: "Business Name",
    category: "general",
    required: true,
    warnIfMissing: true,
    warnIfConflicting: true,
  },
  {
    key: "tax_id",
    label: "Tax ID",
    category: "taxes",
    required: true,
    warnIfMissing: true,
    warnIfConflicting: true,
  },
  {
    key: "owner_name",
    label: "Owner Name",
    category: "general",
    required: true,
    warnIfMissing: true,
    warnIfConflicting: true,
  },
  {
    key: "business_address",
    label: "Business Address",
    category: "general",
    required: false,
    warnIfMissing: false,
    warnIfConflicting: false,
  },
  {
    key: "total_revenue",
    label: "Total Revenue",
    category: "income_statement",
    required: false,
    warnIfMissing: false,
    warnIfConflicting: true,
  },
  {
    key: "net_income",
    label: "Net Income",
    category: "income_statement",
    required: false,
    warnIfMissing: false,
    warnIfConflicting: true,
  },
  {
    key: "cash_on_hand",
    label: "Cash on Hand",
    category: "balance_sheet",
    required: false,
    warnIfMissing: false,
    warnIfConflicting: true,
  },
  {
    key: "accounts_receivable",
    label: "Accounts Receivable",
    category: "ar",
    required: false,
    warnIfMissing: false,
    warnIfConflicting: true,
  },
  {
    key: "accounts_payable",
    label: "Accounts Payable",
    category: "ap",
    required: false,
    warnIfMissing: false,
    warnIfConflicting: true,
  },
  {
    key: "inventory_value",
    label: "Inventory Value",
    category: "inventory",
    required: false,
    warnIfMissing: false,
    warnIfConflicting: true,
  },
  {
    key: "equipment_value",
    label: "Equipment Value",
    category: "equipment",
    required: false,
    warnIfMissing: false,
    warnIfConflicting: true,
  },
  {
    key: "contract_term",
    label: "Contract Term",
    category: "contracts",
    required: false,
    warnIfMissing: false,
    warnIfConflicting: false,
  },
];

export function getOcrFieldRegistry(): OcrFieldDefinition[] {
  return [...OCR_FIELD_REGISTRY];
}

export function getOcrFieldDefinitionByKey(
  key: string
): OcrFieldDefinition | undefined {
  return OCR_FIELD_REGISTRY.find((field) => field.key === key);
}

export function getOcrFieldDefinitionByLabel(
  label: string
): OcrFieldDefinition | undefined {
  const normalized = label.trim().toLowerCase();
  return OCR_FIELD_REGISTRY.find(
    (field) => field.label.trim().toLowerCase() === normalized
  );
}
