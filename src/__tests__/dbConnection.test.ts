import { assertPoolHealthy, checkDb, pool, warmUpDatabase } from "../db";

describe("database connectivity", () => {
  it("runs a simple connection check", async () => {
    const spy = jest
      .spyOn(pool, "query")
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

    await checkDb();

    expect(spy).toHaveBeenCalledWith("select 1");
    spy.mockRestore();
  });

  it("fails fast when warm-up cannot reach the database", async () => {
    const spy = jest
      .spyOn(pool, "query")
      .mockImplementationOnce(() =>
        Promise.reject(new Error("db unavailable"))
      );

    await expect(warmUpDatabase()).rejects.toThrow("db unavailable");

    spy.mockRestore();
  });

  it("detects pool exhaustion", () => {
    const poolState = pool as unknown as {
      waitingCount?: number;
      totalCount?: number;
      options?: { max?: number };
    };
    const previousWaiting = poolState.waitingCount;
    const previousTotal = poolState.totalCount;
    const max = poolState.options?.max ?? 2;

    poolState.waitingCount = 1;
    poolState.totalCount = max;

    expect(() => assertPoolHealthy()).toThrow("db_pool_exhausted");

    poolState.waitingCount = previousWaiting;
    poolState.totalCount = previousTotal;
  });
});
