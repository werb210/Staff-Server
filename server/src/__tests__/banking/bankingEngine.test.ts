import { jest } from "@jest/globals";

import { BankingService } from "../../banking/banking.service";

const sampleBankingBlob = Buffer.from(
  `2024-01-01 payroll 0.00 5000.00 5000.00\n2024-01-15 rent -2000.00 0.00 3000.00`,
);
const mockWhere = jest.fn().mockResolvedValue([{ id: "ver-1", blobKey: "key" }] as any);
const mockFrom = jest.fn(() => ({ where: mockWhere }));
const mockSelect = jest.fn(() => ({ from: mockFrom }));
const mockInsert = jest.fn(() => ({
  values: jest.fn().mockReturnThis(),
  returning: jest.fn().mockResolvedValue([
    {
      id: "bank-1",
      applicationId: "app-1",
      summary: {},
      metricsJson: {},
      monthlyJson: {},
      createdAt: new Date(),
    },
  ] as any),
}));
const dbMocks = { mockInsert, mockSelect, mockWhere };

jest.mock(
  "../../services/blobService",
  () => ({
    getFile: jest.fn().mockResolvedValue(sampleBankingBlob as any),
  } as any),
);

jest.mock("../../db", () => {
  return {
    __esModule: true,
    db: {
      insert: mockInsert,
      select: mockSelect,
    },
    __mocks: dbMocks,
  } as any;
});

jest.mock(
  "../../db/schema",
  () => ({
    applicationTimelineEvents: {},
    bankingAnalysis: {},
    documentVersions: { id: "id", blobKey: "blobKey" },
  } as any),
);

describe.skip("Banking Service", () => {
  it("analyzes transactions and stores metrics", async () => {
    const { mockInsert, mockSelect, mockWhere } = dbMocks as Record<string, jest.Mock>;
    mockInsert.mockClear();
    mockSelect.mockClear();
    mockWhere.mockClear();

    const service = new BankingService();
    const record = await service.analyze({ applicationId: "app-1", documentVersionIds: ["ver-1"] });
    expect(record.id).toBe("bank-1");
    expect(mockInsert).toHaveBeenCalled();
  });
});
