import jwt, { type SignOptions } from "jsonwebtoken";
import type { Server } from "http";
import { ROLES } from "../auth/roles";
import { startServer } from "../index";
import { resetStartupState } from "../startupState";
import { resolveBaseUrl } from "../__tests__/helpers/baseUrl";

const TOKEN_OPTIONS: SignOptions = {
  expiresIn: "1h",
  issuer: "boreal-staff-server",
  audience: "boreal-staff-portal",
};

describe("runtime schema verification", () => {
  let server: Server | null = null;

  afterEach(async () => {
    if (!server) {
      return;
    }
    await new Promise<void>((resolve) => {
      server?.close(() => resolve());
    });
    server = null;
  });

  it("boots and returns 200s for lenders and lender-products", async () => {
    process.env.PORT = "0";
    process.env.NODE_ENV = "test";
    resetStartupState();

    server = await startServer();

    const baseUrl = resolveBaseUrl(server ?? undefined);
    const token = jwt.sign(
      { sub: "schema-runtime-user", role: ROLES.STAFF, tokenVersion: 0 },
      process.env.JWT_SECRET ?? "test-access-secret",
      TOKEN_OPTIONS
    );
    const headers = { Authorization: `Bearer ${token}` };

    const lendersResponse = await fetch(new URL("/api/lenders", baseUrl), {
      headers,
    });
    expect(lendersResponse.status).toBe(200);

    const productsResponse = await fetch(
      new URL("/api/lender-products", baseUrl),
      { headers }
    );
    expect(productsResponse.status).toBe(200);
  });
});
