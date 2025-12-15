import { OcrService } from "../../ocr/ocr.service";

jest.mock("../../services/blobService", () => ({
  getFile: jest.fn().mockResolvedValue(Buffer.from("balance sheet 123-45-6789 example@example.com")),
}));

const ocrInsertReturn = [{
  id: "ocr-1",
  applicationId: "app-1",
  documentId: "doc-1",
  documentVersionId: "ver-1",
  extractedJson: {
    rawText: "balance sheet 123-45-6789 example@example.com",
    categories: { balance_sheet: "balance sheet" },
    globalFields: { sinOrSsn: ["123-45-6789"], emails: ["example@example.com"] },
  },
  categoriesDetected: ["balance_sheet"],
  conflictingFields: [],
  createdAt: new Date(),
}];

jest.mock("../../db", () => {
  const mockInsert = jest.fn(() => ({
    values: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue(ocrInsertReturn),
  }));

  const mockWhere = jest.fn().mockResolvedValue([]);
  const mockFrom = jest.fn(() => ({ where: mockWhere }));
  const mockSelect = jest.fn(() => ({ from: mockFrom }));

  return {
    db: {
      insert: mockInsert,
      select: mockSelect,
    },
    __mocks: { mockInsert, mockSelect, mockWhere },
  };
});

jest.mock("../../db/schema", () => ({
  applicationTimelineEvents: {},
  ocrResults: {
    extractedJson: "extractedJson",
  },
}));

describe("OCR Service", () => {
  it("processes OCR and records categories", async () => {
    const { __mocks } = require("../../db");
    const mockInsert = __mocks.mockInsert as jest.Mock;
    const mockSelect = __mocks.mockSelect as jest.Mock;
    const mockWhere = __mocks.mockWhere as jest.Mock;
    mockInsert.mockClear();
    mockSelect.mockClear();
    mockWhere.mockClear();

    const service = new OcrService();
    const record = await service.process({
      applicationId: "app-1",
      documentId: "doc-1",
      documentVersionId: "ver-1",
      blobKey: "key",
    });

    expect(record.categoriesDetected).toContain("balance_sheet");
    expect(mockInsert).toHaveBeenCalled();
  });
});
