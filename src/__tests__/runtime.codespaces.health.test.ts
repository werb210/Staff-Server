import type { Server } from "http";

const isCodespaces =
  process.env.CODESPACES === "true" ||
  Boolean(process.env.CODESPACE_NAME) ||
  Boolean(process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN);

let baseUrl = process.env.BASE_URL;

if (isCodespaces) {
  if (!baseUrl) {
    throw new Error("BASE_URL is required for Codespaces runtime health checks.");
  }
  if (/localhost|127\.0\.0\.1/i.test(baseUrl)) {
    throw new Error("BASE_URL must be a real Codespaces URL (no localhost).");
  }
}

describe("Codespaces runtime health", () => {
  const endpoints = ["/api/health", "/api/ready", "/api/_int/health"];
  let server: Server | null = null;

  beforeAll(async () => {
    if (isCodespaces) {
      return;
    }
    const { buildApp, registerApiRoutes } = await import("../app");
    const app = buildApp();
    registerApiRoutes(app);
    server = app.listen(0);
    await new Promise<void>((resolve) => {
      server?.once("listening", resolve);
    });
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Failed to resolve server address.");
    }
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      if (!server) {
        resolve();
        return;
      }
      server.close(() => resolve());
    });
  });

  it.each(endpoints)("returns 200 for %s", async (path) => {
    if (!baseUrl) {
      throw new Error("BASE_URL was not configured for runtime health checks.");
    }
    const url = new URL(path, baseUrl).toString();
    const response = await fetch(url, { redirect: "manual" });

    expect(response.status).toBe(200);
    expect(response.status).not.toBe(302);
  });
});
