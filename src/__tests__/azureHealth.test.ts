import request from "supertest";
import { EventEmitter } from "events";
import { buildApp } from "../app";
import {
  resetStartupState,
  setCriticalServicesReady,
  setDbConnected,
  setMigrationsState,
  setSchemaReady,
} from "../startupState";

type MockServer = EventEmitter & {
  listening: boolean;
  close: (cb: () => void) => void;
};

function createMockServer(): MockServer {
  const server = new EventEmitter() as MockServer;
  server.listening = false;
  server.close = (cb: () => void) => cb();
  return server;
}

describe("azure health endpoints", () => {
  it("responds to health immediately", async () => {
    resetStartupState();
    const app = buildApp();
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
  });

  it("gates readiness until the db is ready", async () => {
    resetStartupState();
    const app = buildApp();

    const before = await request(app).get("/api/_int/ready");
    expect(before.status).toBe(503);

    setDbConnected(true);
    setMigrationsState([]);
    setSchemaReady(true);
    setCriticalServicesReady(true);

    const after = await request(app).get("/api/_int/ready");
    expect(after.status).toBe(200);
  });

  it("respects the configured PORT env", () => {
    process.env.PORT = "4777";
    process.env.STARTUP_WATCHDOG_MS = "25";

    const listenSpy = jest.fn(() => {
      const server = createMockServer();
      server.listening = true;
      process.nextTick(() => server.emit("listening"));
      return server as unknown as import("http").Server;
    });

    jest.isolateModules(() => {
      jest.doMock("../app", () => ({
        buildApp: () => ({ listen: listenSpy, use: jest.fn() }),
        registerApiRoutes: jest.fn(),
      }));
      require("../index");
    });

    expect(listenSpy).toHaveBeenCalledWith(4777, "0.0.0.0", expect.any(Function));
  });
});
