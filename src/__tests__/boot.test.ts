import type { AddressInfo } from "net";

async function waitForCondition(condition: () => boolean, timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error("condition_not_met");
}

describe("boot behavior", () => {
  let server: import("http").Server | null = null;

  afterEach(async () => {
    if (!server) {
      return;
    }
    await new Promise<void>((resolve) => {
      server?.close(() => resolve());
    });
    server = null;
  });

  it("starts without required env vars and serves boot endpoints", async () => {
    const originalEnv = process.env;
    process.env = { PORT: "0", STARTUP_WATCHDOG_MS: "2000" };
    let exitSpy: jest.SpyInstance;

    try {
      exitSpy = jest
        .spyOn(process, "exit")
        .mockImplementation((() => undefined) as never);
      jest.resetModules();
      jest.isolateModules(() => {
        const { server: importedServer } = require("../index");
        server = importedServer as import("http").Server;
      });

      await waitForCondition(() => Boolean(server?.listening), 2000);

      const address = server?.address() as AddressInfo;
      const healthRes = await fetch(`http://127.0.0.1:${address.port}/health`);
      expect(healthRes.status).toBe(200);

      const bootRes = await fetch(`http://127.0.0.1:${address.port}/__boot`);
      expect(bootRes.status).toBe(200);
      const bootJson = await bootRes.json();
      expect(bootJson.pid).toBe(process.pid);
      expect(bootJson.port).toBe(address.port);
      expect(Array.isArray(bootJson.envKeys)).toBe(true);

      expect(exitSpy).not.toHaveBeenCalled();
    } finally {
      exitSpy?.mockRestore();
      process.env = originalEnv;
    }
  });
});
