import type { Server } from "http";
import { buildAppWithApiRoutes } from "../../src/app";

export async function startSmokeServer(): Promise<{
  server: Server | null;
  cleanup: () => Promise<void>;
}> {
  let server: Server | null = null;
  const initialBaseUrl = process.env.TEST_BASE_URL;

  if (!initialBaseUrl) {
    const app = buildAppWithApiRoutes();
    await new Promise<void>((resolve) => {
      server = app.listen(0, "127.0.0.1", () => {
        const address = server?.address();
        if (address && typeof address === "object") {
          process.env.TEST_BASE_URL = `http://127.0.0.1:${address.port}`;
        }
        resolve();
      });
    });
  }

  const cleanup = async () => {
    if (server) {
      await new Promise<void>((resolve) => server?.close(() => resolve()));
    }
    if (!initialBaseUrl) {
      delete process.env.TEST_BASE_URL;
    }
  };

  return { server, cleanup };
}
