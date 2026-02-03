import { GoogleSheetsAdapter } from "../src/modules/lenderSubmissions/adapters/GoogleSheetsAdapter";

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
      GoogleAuth: jest.fn().mockImplementation(() => ({})),
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

const config = {
  sheetId: "sheet-123",
  sheetTab: "Sheet1",
  applicationIdHeader: "Application ID",
  columns: [
    { header: "Application ID", path: "application.id" },
    { header: "Submitted At", path: "submittedAt" },
    { header: "Applicant First Name", path: "application.metadata.applicant.firstName" },
    { header: "Applicant Last Name", path: "application.metadata.applicant.lastName" },
    { header: "Annual Revenue", path: "application.metadata.financials.annualRevenue" },
  ],
};

describe("google sheets adapter", () => {
  beforeAll(() => {
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify({
      client_email: "service@example.com",
      private_key: "key",
    });
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
    sheetsInstance.spreadsheets.values.append.mockResolvedValue({
      data: { updates: { updatedRange: "Sheet1!A2:E2" } },
    });

    const adapter = new GoogleSheetsAdapter({ payload, config });
    const result = await adapter.submit(payload.application.id);

    expect(result.success).toBe(true);
    expect(result.response.status).toBe("appended");
    expect(result.response.externalReference).toBe("Sheet1!A2:E2");
    expect(sheetsInstance.spreadsheets.values.append).toHaveBeenCalledTimes(1);
  });

  it("skips append when the application already exists", async () => {
    sheetsInstance.spreadsheets.get.mockResolvedValue({
      data: { sheets: [{ properties: { title: "Sheet1" } }] },
    });
    sheetsInstance.spreadsheets.values.get.mockResolvedValue({
      data: { values: [["Application ID"], ["app-123"]] },
    });

    const adapter = new GoogleSheetsAdapter({ payload, config });
    const result = await adapter.submit(payload.application.id);

    expect(result.success).toBe(true);
    expect(result.response.status).toBe("duplicate");
    expect(sheetsInstance.spreadsheets.values.append).not.toHaveBeenCalled();
  });

  it("flags retryable errors from the Google API", async () => {
    sheetsInstance.spreadsheets.get.mockResolvedValue({
      data: { sheets: [{ properties: { title: "Sheet1" } }] },
    });
    sheetsInstance.spreadsheets.values.get.mockRejectedValue({ response: { status: 503 } });

    const adapter = new GoogleSheetsAdapter({ payload, config });
    const result = await adapter.submit(payload.application.id);

    expect(result.success).toBe(false);
    expect(result.retryable).toBe(true);
  });
});
