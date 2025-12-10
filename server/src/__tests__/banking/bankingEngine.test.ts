import { BankingService } from "../../banking/banking.service";

jest.mock("../../services/blobService", () => ({
  getFile: jest.fn().mockResolvedValue(
    Buffer.from(`2024-01-01 payroll 0.00 5000.00 5000.00\n2024-01-15 rent -2000.00 0.00 3000.00`),
  ),
}));

jest.mock("../../db/client", () => {
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
    ]),
  }));

  const mockWhere = jest.fn().mockResolvedValue([{ id: "ver-1", blobKey: "key" }]);
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
  bankingAnalysis: {},
  documentVersions: { id: "id", blobKey: "blobKey" },
}));

describe("Banking Service", () => {
  it("analyzes transactions and stores metrics", async () => {
    const { __mocks } = require("../../db/client");
    const mockInsert = __mocks.mockInsert as jest.Mock;
    const mockSelect = __mocks.mockSelect as jest.Mock;
    const mockWhere = __mocks.mockWhere as jest.Mock;
    mockInsert.mockClear();
    mockSelect.mockClear();
    mockWhere.mockClear();

    const service = new BankingService();
    const record = await service.analyze({ applicationId: "app-1", documentVersionIds: ["ver-1"] });
    expect(record.id).toBe("bank-1");
    expect(mockInsert).toHaveBeenCalled();
  });
});
