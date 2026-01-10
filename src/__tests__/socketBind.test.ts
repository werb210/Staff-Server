import type { AddressInfo } from "net";

async function waitForListening(server: import("http").Server, timeoutMs: number): Promise<void> {
  if (server.listening) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("server did not start listening"));
    }, timeoutMs);

    server.once("listening", () => {
      clearTimeout(timeout);
      resolve();
    });

    server.once("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

describe("socket bind", () => {
  let server: import("http").Server | null = null;

  const requireServer = (): import("http").Server => {
    if (!server) {
      throw new Error("server not initialized");
    }
    return server;
  };

  afterEach(async () => {
    if (!server) {
      return;
    }
    await new Promise<void>((resolve) => {
      server?.close(() => resolve());
    });
    server = null;
  });

  it("starts a real listener and serves health endpoints", async () => {
    process.env.PORT = "0";
    jest.isolateModules(() => {
      const { server: importedServer } = require("../index");
      server = importedServer as import("http").Server;
    });

    await waitForListening(requireServer(), 50);

    const address = requireServer().address() as AddressInfo;
    expect(requireServer().listening).toBe(true);
    expect(typeof address.port).toBe("number");

    const healthRes = await fetch(`http://127.0.0.1:${address.port}/api/_int/health`);
    expect(healthRes.status).toBe(200);

    const readyRes = await fetch(`http://127.0.0.1:${address.port}/api/_int/ready`);
    expect(readyRes.status).toBe(200);
  });

  it("binds immediately without async gating", async () => {
    process.env.PORT = "0";
    jest.isolateModules(() => {
      const { server: importedServer } = require("../index");
      server = importedServer as import("http").Server;
    });

    await waitForListening(requireServer(), 50);
    expect(requireServer().listening).toBe(true);
  });
});
