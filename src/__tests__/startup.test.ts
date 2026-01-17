import type { AddressInfo } from "net";
import { resetStartupState } from "../startupState";

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

describe("startup behavior", () => {
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

  it("listens within 2s and responds to health before readiness", async () => {
    process.env.PORT = "0";
    process.env.STARTUP_WATCHDOG_MS = "2000";
    process.env.NODE_ENV = "test";
    resetStartupState();

    jest.isolateModules(() => {
      const { startServer } = require("../index");
      server = startServer() as import("http").Server;
    });

    await waitForCondition(() => Boolean(server?.listening), 2000);

    const address = server?.address() as AddressInfo;
    const healthRes = await fetch(`http://127.0.0.1:${address.port}/health`);
    expect(healthRes.status).toBe(200);

    const readyRes = await fetch(`http://127.0.0.1:${address.port}/api/_int/ready`);
    expect(readyRes.status).toBe(503);
  });

  it("closes cleanly without hanging", async () => {
    process.env.PORT = "0";
    process.env.STARTUP_WATCHDOG_MS = "2000";
    process.env.NODE_ENV = "test";
    resetStartupState();

    jest.isolateModules(() => {
      const { startServer } = require("../index");
      server = startServer() as import("http").Server;
    });

    await waitForCondition(() => Boolean(server?.listening), 2000);

    await new Promise<void>((resolve) => {
      server?.close(() => resolve());
    });
    expect(server?.listening).toBe(false);
  });
});
