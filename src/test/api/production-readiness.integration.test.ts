import type { Express } from "express";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "crypto";
import { pool } from "../../db";
import { createTestApp } from "../helpers/testApp";

const { sendSMSMock } = vi.hoisted(() => ({
  sendSMSMock: vi.fn(async () => undefined),
}));

vi.mock("../../services/smsService", () => ({
  sendSMS: sendSMSMock,
}));

vi.mock("../../services/supportService", () => ({
  createSupportThread: vi.fn(async () => ({ id: "support-thread-test" })),
}));

let app: Express;

describe("production readiness endpoint verification", () => {
  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(() => {
    sendSMSMock.mockClear();
  });

  it("validates and persists POST /api/readiness without SMS side effect", async () => {
    const invalid = await request(app).post("/api/readiness").send({
      companyName: "",
      email: "invalid",
    });
    expect(invalid.status).toBe(400);

    const response = await request(app).post("/api/readiness").send({
      companyName: "Northwind Labs",
      fullName: "Alex Finch",
      phone: "+1 (415) 555-1212",
      email: "alex@example.com",
      yearsInBusiness: 4,
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.leadId).toEqual(expect.any(String));

    const session = await pool.query("select id from readiness_sessions where id = $1", [response.body.data.sessionId]);
    expect(session.rowCount).toBe(1);
    expect(sendSMSMock).toHaveBeenCalledTimes(0);
  });

  it("supports POST /api/readiness/continue and returns latest continuation session", async () => {
    await pool.query(
      `insert into continuation (id, company_name, full_name, email, phone, industry)
       values ($1, 'Resume Co', 'Jordan Casey', 'resume@example.com', '+14155550000', 'Services')`,
      [randomUUID()]
    );

    const missing = await request(app).post("/api/readiness/continue").send({ email: "" });
    expect(missing.status).toBe(400);

    const response = await request(app)
      .post("/api/readiness/continue")
      .send({ email: "resume@example.com" });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.session.email).toBe("resume@example.com");
  });

  it("supports chat session + transfer endpoints and persists status", async () => {
    const sessionId = randomUUID();
    const chatSchema = await pool.query<{ column_name: string }>(
      `select column_name from information_schema.columns
       where table_schema = 'public' and table_name = 'chat_sessions'`
    );
    const chatColumns = new Set(chatSchema.rows.map((row) => row.column_name));

    if (chatColumns.has("user_type") && !chatColumns.has("channel")) {
      await pool.query(
        `insert into chat_sessions (id, user_type, status) values ($1, 'guest', 'active')`,
        [sessionId]
      );
    } else {
      await pool
        .query(
          `insert into chat_sessions (id, source, channel, status) values ($1, 'website', 'text', 'ai')`,
          [sessionId]
        )
        .catch(async () => {
          await pool.query(
            `insert into chat_sessions (id, user_type, status, source) values ($1, 'guest', 'active', 'website')`,
            [sessionId]
          );
        });
    }

    const transferInvalid = await request(app).post("/api/chat/transfer").send({});
    expect(transferInvalid.status).toBe(400);

    const transfer = await request(app).post("/api/chat/transfer").send({ sessionId });
    expect(transfer.status).toBe(200);

    const status = await pool.query("select status from chat_sessions where id = $1", [sessionId]);
    expect(["human", "escalated"]).toContain(status.rows[0]?.status);
  });

  it("supports POST /api/support/report and persists issue report", async () => {
    const response = await request(app).post("/api/support/report").send({
      description: "Broken CTA on homepage",
      route: "/",
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    const report = await pool.query(
      "select description from issue_reports where description = $1",
      ["Broken CTA on homepage"]
    );
    expect(report.rowCount).toBeGreaterThan(0);
  });

  it("supports POST /api/startup-interest and stores startup_interest tag", async () => {
    const sessionId = randomUUID();
    const schema = await pool.query<{ column_name: string }>(
      `select column_name from information_schema.columns
       where table_schema = 'public' and table_name = 'ai_sessions'`
    );
    const columns = new Set(schema.rows.map((row) => row.column_name));
    if (columns.has("visitor_id") && columns.has("context")) {
      await pool.query(
        `insert into ai_sessions (id, visitor_id, context, status, source)
         values ($1, $2, 'website_chat', 'active', 'website')`,
        [sessionId, randomUUID()]
      );
    } else {
      await pool.query(
        `insert into ai_sessions (id, source, status)
         values ($1, 'website', 'ai')`,
        [sessionId]
      );
    }

    const response = await request(app).post("/api/startup-interest").send({
      sessionId,
      tags: ["startup_interest"],
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    if (columns.has("startup_interest_tags")) {
      const updated = await pool.query(
        "select startup_interest_tags from ai_sessions where id = $1",
        [sessionId]
      );
      expect(updated.rows[0]?.startup_interest_tags).toEqual(["startup_interest"]);
    } else {
      expect(response.body.persistedToSession).toBe(false);
    }
  });

  it("enforces unauthorized access on protected readiness portal endpoint", async () => {
    const unauthorized = await request(app).get("/api/portal/readiness-leads");
    expect(unauthorized.status).toBe(401);
  });
});
