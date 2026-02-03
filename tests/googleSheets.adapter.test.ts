import { submitGoogleSheetsApplication } from "../src/lenders/adapters/googleSheets.adapter";
import { MERCHANT_GROWTH_SHEET_MAP } from "../src/lenders/config/merchantGrowth.sheetMap";
const sheetsInstance = {
  spreadsheets: {
    get: jest.fn(),
    values: {
      get: jest.fn(),
      append: jest.fn(),
    },
  },
};

jest.mock("googleapis", () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({ setCredentials: jest.fn() })),
    },
    sheets: jest.fn(() => sheetsInstance),
  },
}));

const payload = {
  application: {
    id: "app-123",
    ownerUserId: null,
    name: "Test Application",
    metadata: {
      applicant: {
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@example.com",
        phone: "+15555550123",
      },
      business: {
        legalName: "Sample Biz",
        taxId: "12-3456789",
        entityType: "LLC",
        address: {
          line1: "123 Main",
          city: "Austin",
          state: "TX",
          postalCode: "78701",
          country: "US",
        },
      },
      financials: {
        term: "12",
        annualRevenue: 120000,
        monthlyRevenue: 10000,
        bankingSummary: "Stable",
      },
    },
    productType: "standard",
    lenderId: "lender-1",
    lenderProductId: "product-1",
    requestedAmount: 25000,
  },
  documents: [],
  submittedAt: "2024-01-02T00:00:00.000Z",
};

describe("google sheets adapter", () => {
  beforeAll(() => {
    process.env.GOOGLE_CLIENT_ID = "test-client-id";
    process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
    process.env.GOOGLE_REDIRECT_URI = "https://example.com/oauth";
    process.env.GOOGLE_SHEETS_REFRESH_TOKEN = "test-refresh-token";
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("appends a new row when the application is not present", async () => {
    sheetsInstance.spreadsheets.get.mockResolvedValue({
      data: { sheets: [{ properties: { title: "Sheet1" } }] },
    });
    sheetsInstance.spreadsheets.values.get.mockResolvedValue({
      data: { values: [["Application ID"], ["other-app"]] },
    });
    sheetsInstance.spreadsheets.values.append.mockResolvedValue({});

    const result = await submitGoogleSheetsApplication({
      payload,
      sheetId: "sheet-123",
      sheetMap: MERCHANT_GROWTH_SHEET_MAP,
    });

    expect(result.success).toBe(true);
    expect(result.response.status).toBe("appended");
    expect(sheetsInstance.spreadsheets.values.append).toHaveBeenCalledTimes(1);
  });

  it("skips append when the application already exists", async () => {
    sheetsInstance.spreadsheets.get.mockResolvedValue({
      data: { sheets: [{ properties: { title: "Sheet1" } }] },
    });
    sheetsInstance.spreadsheets.values.get.mockResolvedValue({
      data: { values: [["Application ID"], ["app-123"]] },
    });

    const result = await submitGoogleSheetsApplication({
      payload,
      sheetId: "sheet-123",
      sheetMap: MERCHANT_GROWTH_SHEET_MAP,
    });

    expect(result.success).toBe(true);
    expect(result.response.status).toBe("duplicate");
    expect(sheetsInstance.spreadsheets.values.append).not.toHaveBeenCalled();
  });

  it("flags retryable errors from the Google API", async () => {
    sheetsInstance.spreadsheets.get.mockResolvedValue({
      data: { sheets: [{ properties: { title: "Sheet1" } }] },
    });
    sheetsInstance.spreadsheets.values.get.mockRejectedValue({ response: { status: 503 } });

    const result = await submitGoogleSheetsApplication({
      payload,
      sheetId: "sheet-123",
      sheetMap: MERCHANT_GROWTH_SHEET_MAP,
    });

    expect(result.success).toBe(false);
    expect(result.retryable).toBe(true);
  });
});
