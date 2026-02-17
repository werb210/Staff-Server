import { createServer as createHttpServer } from "http";
import { createHash } from "crypto";
import type { AddressInfo } from "net";
import request from "supertest";
import { WebSocket } from "ws";
import type { Express } from "express";
import { beforeAll, describe, expect, it } from "vitest";
import { createTestApp } from "../helpers/testApp";
import { pool } from "../../db";
import { initChatSocket } from "../../modules/ai/socket.server";

let app: Express;

describe("v1 production completion", () => {
  beforeAll(async () => {
    app = await createTestApp();
  });

  it("supports readiness session creation + continuation lookup by readiness token", async () => {
    const payload = {
      companyName: "Nova Forge",
      fullName: "Morgan Vale",
      phone: "+14155550777",
      email: "morgan.vale@example.com",
      industry: "Manufacturing",
      yearsInBusiness: 4,
      monthlyRevenue: 55000,
      annualRevenue: 660000,
      arBalance: 25000,
      collateralAvailable: false,
    };

    const createRes = await request(app).post("/api/readiness/submit").send(payload);
    expect([200, 201]).toContain(createRes.status);
    expect(createRes.body?.data?.readinessToken).toEqual(expect.any(String));
    expect(createRes.body?.data?.sessionId).toEqual(expect.any(String));
    expect(typeof createRes.body?.data?.score).toBe("number");

    const tokenRes = await request(app).get(`/api/readiness/session/${createRes.body.data.sessionId}`).query({ token: createRes.body.data.readinessToken });
    expect(tokenRes.status).toBe(200);
    expect(tokenRes.body?.data?.kyc?.email).toBe(payload.email);
    expect(Number(tokenRes.body?.data?.financial?.monthlyRevenue)).toBe(55000);

    const missingToken = await request(app).get(`/api/readiness/session/${createRes.body.data.sessionId}`);
    expect(missingToken.status).toBe(400);

    const wrongToken = await request(app)
      .get(`/api/readiness/session/${createRes.body.data.sessionId}`)
      .query({ token: "00000000-0000-4000-8000-000000000000" });
    expect(wrongToken.status).toBe(401);

    const dupRes = await request(app).post("/api/readiness").send(payload);
    expect([200, 201]).toContain(dupRes.status);
    expect(dupRes.body.sessionId).toBe(createRes.body.data.sessionId);

    const sessions = await pool.query(
      `select id from readiness_sessions
       where lower(email) = lower($1)
         and is_active = true`,
      [payload.email]
    );
    expect(sessions.rowCount).toBe(1);
  });




  it("dedupes contact form entries by email/phone", async () => {
    const payload = {
      companyName: "Beacon Ops",
      fullName: "Jamie Fields",
      email: "jamie.fields@example.com",
      phone: "+14155550888",
      source: "website_contact",
    };

    const one = await request(app).post("/api/contact/submit").send(payload);
    const two = await request(app).post("/api/contact").send(payload);

    expect(one.status).toBe(200);
    expect(two.status).toBe(200);

    const contactLeads = await pool.query(
      `select id from contact_leads where lower(email)=lower($1)
        or regexp_replace(phone, '\\D','','g') = regexp_replace($2, '\\D','','g')`,
      [payload.email, payload.phone]
    );
    expect(contactLeads.rowCount).toBe(1);

    const crmLeads = await pool.query(
      `select id from crm_leads where lower(email)=lower($1)
        or regexp_replace(phone, '\\D','','g') = regexp_replace($2, '\\D','','g')`,
      [payload.email, payload.phone]
    );
    expect(crmLeads.rowCount).toBe(1);
  });

  it("supports websocket transfer event for staff override mode", async () => {
    const server = createHttpServer(app);
    const wss = initChatSocket(server);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));

    const address = server.address() as AddressInfo;
    const sessionId = "11111111-1111-4111-8111-111111111111";

    const client = new WebSocket(`ws://127.0.0.1:${address.port}/ws/chat`);
    const staff = new WebSocket(`ws://127.0.0.1:${address.port}/ws/chat`);

    const messages: string[] = [];

    await new Promise<void>((resolve, reject) => {
      client.once("open", () => {
        client.send(JSON.stringify({ type: "join_session", sessionId, userId: "u-client" }));
      });
      staff.once("open", () => {
        staff.send(JSON.stringify({ type: "staff_join", sessionId, userId: "u-staff" }));
      });
      client.on("message", (msg) => {
        messages.push(msg.toString());
        if (messages.some((entry) => entry.includes('"type":"transferring"'))) {
          resolve();
        }
      });
      setTimeout(() => reject(new Error("timeout waiting for transfer event")), 3000);
    });

    expect(messages.some((entry) => entry.includes('"state":"HUMAN_ACTIVE"'))).toBe(true);

    await new Promise<void>((resolve, reject) => {
      client.on("message", (msg) => {
        const event = msg.toString();
        if (event.includes('"type":"suppressed"')) {
          resolve();
        }
      });
      client.send(JSON.stringify({ type: "ai_message", sessionId, content: "should_suppress" }));
      setTimeout(() => reject(new Error("timeout waiting for suppression")), 2500);
    });

    await new Promise<void>((resolve, reject) => {
      client.send(JSON.stringify({ type: "close_chat", sessionId }));
      setTimeout(() => resolve(), 250);
      setTimeout(() => reject(new Error("timeout waiting close")), 2000);
    });

    const sessionStatus = await pool.query(
      `select status from chat_sessions where id = $1 limit 1`,
      [sessionId]
    );
    expect(sessionStatus.rows[0]?.status).toBe("closed");

    client.close();
    staff.close();
    wss.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });


  it("supports websocket query handshake with sessionId/userId/context", async () => {
    const server = createHttpServer(app);
    const wss = initChatSocket(server);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));

    const address = server.address() as AddressInfo;
    const sessionId = "22222222-2222-4222-8222-222222222222";

    const client = new WebSocket(`ws://127.0.0.1:${address.port}/ws/chat?sessionId=${sessionId}&userId=query-user&context=website`);

    await new Promise<void>((resolve, reject) => {
      client.once("open", () => {
        client.send(JSON.stringify({ type: "connect" }));
      });
      client.on("message", (msg) => {
        const text = msg.toString();
        if (text.includes('"type":"joined"')) {
          resolve();
        }
      });
      setTimeout(() => reject(new Error("timeout waiting for joined handshake")), 2500);
    });

    client.close();
    wss.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("is SMS idempotent for duplicate contact submissions", async () => {
    const payload = {
      companyName: "SMS Guard Inc",
      fullName: "Sky Ramos",
      email: "sky.ramos@example.com",
      phone: "+14155550999",
      source: "website_contact",
    };

    const one = await request(app).post("/api/contact/submit").send(payload);
    const two = await request(app).post("/api/contact/submit").send(payload);

    expect(one.status).toBe(200);
    expect(two.status).toBe(200);

    const primaryKey = createHash("sha256")
      .update(`contact_form:${payload.email.toLowerCase()}:${payload.phone}`)
      .digest("hex");
    const intakeKey = createHash("sha256")
      .update(`contact_form:intake:${payload.email.toLowerCase()}:${payload.phone}`)
      .digest("hex");

    const dispatches = await pool.query(
      "select id from sms_dispatches where dispatch_key = $1 or dispatch_key = $2",
      [primaryKey, intakeKey]
    );

    expect(dispatches.rowCount).toBeGreaterThanOrEqual(1);
    expect(dispatches.rowCount).toBeLessThanOrEqual(2);
  });

  it("rejects malformed payloads on readiness and chat endpoints", async () => {
    const readinessBad = await request(app).post("/api/readiness").send({ email: "bad" });
    expect(readinessBad.status).toBe(400);

    const startBad = await request(app).post("/api/chat/start").send({ source: "<script>x</script>" });
    expect(startBad.status).toBe(201);

    const messageBad = await request(app).post("/api/chat/message").send({ sessionId: "bad", message: "x" });
    expect(messageBad.status).toBe(400);
  });

});
