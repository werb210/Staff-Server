import type { Express } from "express";
import type { Server } from "http";
import { createServer, type CreateServerOptions } from "./createServer";

type TestServer = {
  app: Express;
  server: Server;
  url: string;
  close: () => Promise<void>;
};

export async function createTestServer(
  options: CreateServerOptions = {}
): Promise<TestServer> {
  const app = await createServer({
    ...options,
    config: {
      skipEnvCheck: true,
      skipWarmup: true,
      skipSchemaCheck: true,
      skipSeed: true,
      skipCorsCheck: true,
      skipServicesInit: true,
      startFollowUpJobs: false,
      ...options.config,
    },
  });

  const server = await new Promise<Server>((resolve) => {
    const listener = app.listen(0, "127.0.0.1", () => {
      resolve(listener);
    });
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("test_server_address_unavailable");
  }
  const url = `http://127.0.0.1:${address.port}`;

  return {
    app,
    server,
    url,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      }),
  };
}
