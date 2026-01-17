const baseUrl = process.env.BASE_URL;

if (!baseUrl) {
  throw new Error("BASE_URL is required for Codespaces runtime health checks.");
}

const isCodespaces =
  process.env.CODESPACES === "true" ||
  Boolean(process.env.CODESPACE_NAME) ||
  Boolean(process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN);

if (isCodespaces && /localhost|127\.0\.0\.1/i.test(baseUrl)) {
  throw new Error("BASE_URL must be a real Codespaces URL (no localhost).");
}

describe("Codespaces runtime health", () => {
  const endpoints = ["/api/health", "/api/ready", "/api/_int/health"];

  it.each(endpoints)("returns 200 for %s", async (path) => {
    const url = new URL(path, baseUrl).toString();
    const response = await fetch(url, { redirect: "manual" });

    expect(response.status).toBe(200);
    expect(response.status).not.toBe(302);
  });
});
