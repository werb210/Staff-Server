export type GoogleSheetsPayload = {
  application: {
    id: string;
    ownerUserId: string | null;
    name: string;
    metadata: unknown;
    productType: string;
    lenderId: string | null;
    lenderProductId: string | null;
    requestedAmount: number | null;
  };
  documents: Array<{
    documentId: string;
    documentType: string;
    title: string;
    versionId: string;
    version: number;
    metadata: unknown;
    content: string;
  }>;
  submittedAt: string;
};

export type SheetMapColumn = {
  header: string;
  value: (payload: GoogleSheetsPayload) => string | number | null;
};

export type GoogleSheetsSheetMap = {
  columns: SheetMapColumn[];
  applicationIdHeader: string;
};

export const MERCHANT_GROWTH_LENDER_NAME = "Merchant Growth";

function getMetadata(payload: GoogleSheetsPayload): Record<string, unknown> {
  if (payload.application.metadata && typeof payload.application.metadata === "object") {
    return payload.application.metadata as Record<string, unknown>;
  }
  return {};
}

function getApplicant(payload: GoogleSheetsPayload): Record<string, unknown> {
  const metadata = getMetadata(payload);
  const applicant = metadata.applicant;
  return applicant && typeof applicant === "object" ? (applicant as Record<string, unknown>) : {};
}

function getBusiness(payload: GoogleSheetsPayload): Record<string, unknown> {
  const metadata = getMetadata(payload);
  const business = metadata.business;
  return business && typeof business === "object" ? (business as Record<string, unknown>) : {};
}

function getBusinessAddress(payload: GoogleSheetsPayload): Record<string, unknown> {
  const business = getBusiness(payload);
  const address = business.address;
  return address && typeof address === "object" ? (address as Record<string, unknown>) : {};
}

function getFinancials(payload: GoogleSheetsPayload): Record<string, unknown> {
  const metadata = getMetadata(payload);
  const financials = metadata.financials ?? metadata.revenue ?? metadata.banking;
  return financials && typeof financials === "object"
    ? (financials as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return "";
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  const parsed = typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

export const MERCHANT_GROWTH_SHEET_MAP: GoogleSheetsSheetMap = {
  applicationIdHeader: "Application ID",
  columns: [
    {
      header: "Application ID",
      value: (payload) => payload.application.id,
    },
    {
      header: "Submitted At",
      value: (payload) => payload.submittedAt,
    },
    {
      header: "Applicant First Name",
      value: (payload) => asString(getApplicant(payload).firstName),
    },
    {
      header: "Applicant Last Name",
      value: (payload) => asString(getApplicant(payload).lastName),
    },
    {
      header: "Applicant Email",
      value: (payload) => asString(getApplicant(payload).email),
    },
    {
      header: "Applicant Phone",
      value: (payload) => asString(getApplicant(payload).phone),
    },
    {
      header: "Business Legal Name",
      value: (payload) => asString(getBusiness(payload).legalName),
    },
    {
      header: "Business Tax ID",
      value: (payload) => asString(getBusiness(payload).taxId),
    },
    {
      header: "Business Entity Type",
      value: (payload) => asString(getBusiness(payload).entityType),
    },
    {
      header: "Business Address Line 1",
      value: (payload) => asString(getBusinessAddress(payload).line1),
    },
    {
      header: "Business City",
      value: (payload) => asString(getBusinessAddress(payload).city),
    },
    {
      header: "Business State",
      value: (payload) => asString(getBusinessAddress(payload).state),
    },
    {
      header: "Business Postal Code",
      value: (payload) => asString(getBusinessAddress(payload).postalCode),
    },
    {
      header: "Business Country",
      value: (payload) => asString(getBusinessAddress(payload).country),
    },
    {
      header: "Requested Amount",
      value: (payload) => payload.application.requestedAmount ?? null,
    },
    {
      header: "Product Type",
      value: (payload) => payload.application.productType,
    },
    {
      header: "Requested Term",
      value: (payload) => asString(getFinancials(payload).term),
    },
    {
      header: "Annual Revenue",
      value: (payload) =>
        asNumber((getFinancials(payload).annualRevenue ?? getFinancials(payload).annual) as unknown),
    },
    {
      header: "Monthly Revenue",
      value: (payload) =>
        asNumber((getFinancials(payload).monthlyRevenue ?? getFinancials(payload).monthly) as unknown),
    },
    {
      header: "Banking Summary",
      value: (payload) => asString(getFinancials(payload).bankingSummary),
    },
  ],
};
