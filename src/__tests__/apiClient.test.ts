import { apiClient } from "../api";

describe("apiClient", () => {
  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        headers: { get: () => "application/json" },
        json: () => Promise.resolve({ message: "OK", data: [] }),
      } as unknown as Response),
    );
  });

  it("unwraps API envelope", async () => {
    const applications = await apiClient.getApplications();
    expect(applications).toEqual([]);
  });

  it("transforms pipeline response", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      headers: { get: () => "application/json" },
      json: () => Promise.resolve({ message: "OK", data: [{ id: "1", name: "draft", position: 0, count: 1, totalLoanAmount: 10, averageScore: 80, lastUpdatedAt: new Date().toISOString() }] }),
    } as unknown as Response);

    const pipeline = await apiClient.getPipeline();
    expect(pipeline.stages[0].name).toBe("draft");
  });
});
