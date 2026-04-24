import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { securityHeaders } from "../../src/middleware/security.js";

describe("security headers", () => {
  it("sets twilio wildcard CSP entries and removes bare voice-js entries", async () => {
    const app = express();
    app.use(securityHeaders);
    app.get("/", (_req, res) => res.json({ ok: true }));

    const res = await request(app).get("/");

    const csp = res.headers["content-security-policy"] as string;
    expect(csp).toContain("https://*.twilio.com");
    expect(csp).toContain("wss://*.twilio.com");
    expect(csp).not.toContain("https://voice-js.twilio.com");
    expect(csp).not.toContain("wss://voice-js.twilio.com");
  });
});
