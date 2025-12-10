import { BankingEngine } from "../../bankingEngine";

jest.mock("../../db/client", () => ({
  db: {
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue([{ id: "bank-1", summary: {} }]),
  },
}));

jest.mock("../../db/schema", () => ({
  applicationTimelineEvents: {},
  bankingAnalysis: {},
}));

describe("BankingEngine", () => {
  it("creates a banking analysis record", async () => {
    const engine = new BankingEngine();
    const record = await engine.analyze({ applicationId: "app-1" });
    expect(record.id).toBe("bank-1");
  });
});
