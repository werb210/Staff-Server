import { jest } from "@jest/globals";

let OcrService: typeof import("../../ocr/ocr.service").OcrService;

jest.mock(
  "../../services/blobService",
  () => ({
    getFile: jest.fn().mockResolvedValue(Buffer.from("balance sheet 123-45-6789 example@example.com")),
  } as any),
);

const ocrInsertReturn: any[] = [{
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

const mockWhere = jest.fn().mockResolvedValue([] as any);
const mockFrom = jest.fn(() => ({ where: mockWhere }));
const mockSelect = jest.fn(() => ({ from: mockFrom }));
const mockInsert = jest.fn(() => ({
  values: jest.fn().mockReturnThis(),
  returning: jest.fn().mockResolvedValue(ocrInsertReturn),
}));
const dbMocks = { mockInsert, mockSelect, mockWhere };

jest.mock("../../db", () => ({
  __esModule: true,
  db: {
    insert: mockInsert,
    select: mockSelect,
  },
  __mocks: dbMocks,
} as any));

jest.mock(
  "../../db/schema",
  () => ({
    applicationTimelineEvents: {},
    ocrResults: {
      extractedJson: "extractedJson",
    },
  } as any),
);

describe.skip("OCR Service", () => {
  it("processes OCR and records categories", async () => {
    const { mockInsert, mockSelect, mockWhere } = dbMocks as Record<string, jest.Mock>;
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
