import { SubmissionRouter } from "../src/modules/lenderSubmissions/SubmissionRouter";

const submitMock = jest.fn();

jest.mock("../src/modules/lenderSubmissions/googleSheets.adapter", () => ({
  GoogleSheetsAdapter: jest.fn().mockImplementation(() => ({
    submit: submitMock,
  })),
}));

const payload = {
  application: {
    id: "app-123",
    ownerUserId: null,
    name: "Test Application",
    metadata: {},
    productType: "standard",
    lenderId: "lender-1",
    lenderProductId: "product-1",
    requestedAmount: 1000,
  },
  documents: [],
  submittedAt: "2024-01-02T00:00:00.000Z",
};

describe("SubmissionRouter", () => {
  beforeEach(() => {
    submitMock.mockReset();
    submitMock.mockResolvedValue({
      success: true,
      response: { status: "ok", receivedAt: new Date().toISOString() },
      failureReason: null,
      retryable: false,
    });
  });

  it("selects the Google Sheets adapter for google_sheet methods", async () => {
    const router = new SubmissionRouter({
      method: "google_sheet",
      payload,
      attempt: 0,
      lenderId: "lender-1",
      submissionEmail: null,
      submissionConfig: {
        sheetId: "sheet-1",
        sheetTab: "Sheet1",
        mapping: { "Application ID": "application.id" },
      },
    });

    const result = await router.submit(payload.application.id);

    expect(result.success).toBe(true);
    expect(submitMock).toHaveBeenCalledWith(payload.application.id);
  });
});
