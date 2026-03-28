import request from "supertest";

import { createServer } from "../src/server/createServer";
import { assertRequiredEnv } from "../src/server/runtimeGuards";

describe("System boot", () => {
  it("boots with zero external dependencies", async () => {
    const app = createServer();

    const res = await request(app).get("/health");

    expect(res.body).toEqual({ success: true });
  });

  it("crashes when DATABASE_URL is missing outside test mode", () => {
    expect(() => {
      assertRequiredEnv({
        NODE_ENV: "production",
        PORT: "8080",
        JWT_SECRET: "secret",
        REDIS_URL: "redis://127.0.0.1:6379",
        TWILIO_ACCOUNT_SID: "sid",
      });
    }).toThrow("MISSING_ENV: DATABASE_URL");
  });

  it("crashes when REDIS_URL is missing outside test mode", () => {
    expect(() => {
      assertRequiredEnv({
        NODE_ENV: "production",
        PORT: "8080",
        DATABASE_URL: "postgres://example",
        JWT_SECRET: "secret",
        TWILIO_ACCOUNT_SID: "sid",
      });
    }).toThrow("REDIS_REQUIRED");
  });

  it("crashes when TWILIO_ACCOUNT_SID is missing outside test mode", () => {
    expect(() => {
      assertRequiredEnv({
        NODE_ENV: "production",
        PORT: "8080",
        DATABASE_URL: "postgres://example",
        JWT_SECRET: "secret",
        REDIS_URL: "redis://127.0.0.1:6379",
      });
    }).toThrow("TWILIO_REQUIRED");
  });
});
