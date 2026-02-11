import express from "express";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { pool } from "../db";
import { generateEmbedding } from "../ai/embeddingService";
import { retrieveTopKnowledgeChunks } from "../ai/retrievalService";
import { matchLenders } from "../ai/lenderMatchEngine";

vi.mock("../middleware/auth", () => ({
  requireAuth: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.user = {
      userId: "00000000-0000-0000-0000-000000000999",
      role: "ADMIN",
      silo: "default",
      siloFromToken: true,
      capabilities: [],
    } as any;
    next();
  },
}));

describe("AI backend", () => {
  beforeAll(async () => {
    await pool.query(`create table if not exists ai_knowledge_documents (
      id uuid,
      filename text not null,
      category text not null,
      active boolean not null default true,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    )`);
    await pool.query(`create table if not exists ai_knowledge_chunks (
      id uuid,
      document_id uuid not null,
      content text not null,
      embedding jsonb not null,
      created_at timestamp not null default now()
    )`);
    await pool.query(`create table if not exists chat_sessions (
      id uuid,
      user_type text not null,
      status text not null,
      escalated_to uuid null,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    )`);
    await pool.query(`create table if not exists chat_messages (
      id uuid,
      session_id uuid not null,
      role text not null,
      message text not null,
      metadata jsonb null,
      created_at timestamp not null default now()
    )`);
    await pool.query(`create table if not exists issue_reports (
      id uuid,
      session_id uuid null,
      description text not null,
      page_url text not null,
      browser_info text not null,
      screenshot_path text null,
      status text not null,
      created_at timestamp not null default now()
    )`);
    await pool.query(`create table if not exists ai_prequal_sessions (
      id uuid,
      session_id uuid not null,
      revenue numeric null,
      industry text null,
      time_in_business integer null,
      province text null,
      requested_amount numeric null,
      lender_matches jsonb not null default '[]'::jsonb,
      created_at timestamp not null default now()
    )`);
    await pool.query(`create table if not exists lender_products (
      id uuid,
      lender_id uuid not null,
      name text not null,
      country text null,
      active boolean not null default true,
      updated_at timestamp not null default now()
    )`);
    await pool.query(`create table if not exists lender_product_requirements (
      id uuid,
      lender_product_id uuid not null,
      document_type text not null,
      required boolean not null,
      min_amount integer null,
      max_amount integer null,
      created_at timestamp not null default now()
    )`);
  });

  beforeEach(async () => {
    const tables = [
      "ai_prequal_sessions",
      "issue_reports",
      "chat_messages",
      "chat_sessions",
      "ai_knowledge_chunks",
      "ai_knowledge_documents",
      "lender_product_requirements",
      "lender_products",
    ];
    for (const table of tables) {
      await pool.query(`delete from ${table}`);
    }
  });

  it("embedding generates vector", async () => {
    const vector = await generateEmbedding("Boreal marketplace lending");
    expect(vector.length).toBeGreaterThan(0);
  });

  it("retrieval returns chunks", async () => {
    await pool.query(
      `insert into ai_knowledge_documents (id, filename, category, active, created_at, updated_at)
       values ('00000000-0000-0000-0000-000000000001', 'faq.pdf', 'product', true, now(), now())`
    );
    await pool.query(
      `insert into ai_knowledge_chunks (id, document_id, content, embedding, created_at)
       values
       ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Boreal supports small businesses.', '[0.1,0.2,0.3]'::jsonb, now()),
       ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'Term loans available across Canada.', '[0.2,0.3,0.4]'::jsonb, now())`
    );

    const results = await retrieveTopKnowledgeChunks("What is Boreal?", 5);
    expect(results.length).toBeGreaterThan(0);
  });

  it("lender match scoring works", async () => {
    await pool.query(
      `insert into lenders (id, name, country, status, active, submission_method, created_at, updated_at)
       values ('20000000-0000-0000-0000-000000000001', 'Lender One', 'CA', 'ACTIVE', true, 'email', now(), now())
       on conflict (id) do nothing`
    );
    await pool.query(
      `insert into lender_products (id, lender_id, name, country, active, created_at, updated_at)
       values ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Fast Capital', 'CA', true, now(), now())`
    );
    await pool.query(
      `insert into lender_product_requirements
       (id, lender_product_id, document_type, required, min_amount, max_amount, created_at)
       values ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'bank_statement', true, 10000, 250000, now())`
    );

    const matches = await matchLenders({
      requestedAmount: 50000,
      revenue: 250000,
      timeInBusiness: 36,
      province: "ON",
    });

    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].likelihoodPercent).toBeGreaterThan(0);
  });

  it("chat endpoint returns valid JSON", async () => {
    const { default: aiRoutes } = await import("../routes/ai");
    const app = express();
    app.use(express.json());
    app.use("/api/ai", aiRoutes);

    const response = await request(app)
      .post("/api/ai/chat")
      .send({ message: "My revenue is 300000 and amount 50000" });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("message");
    expect(response.body).toHaveProperty("escalationAvailable", true);
  });

  it("issue report saves record", async () => {
    const { default: aiRoutes } = await import("../routes/ai");
    const app = express();
    app.use(express.json());
    app.use("/api/ai", aiRoutes);

    const response = await request(app)
      .post("/api/ai/report-issue")
      .field("description", "Button is hidden")
      .field("page_url", "https://example.com/page")
      .field("browser_info", "Chrome")
      .attach("screenshot", Buffer.from("fake-image"), "issue.png");

    expect(response.status).toBe(201);

    const count = await pool.query<{ count: number }>(
      "select count(*)::int as count from issue_reports"
    );
    expect(count.rows[0]?.count).toBe(1);
  });
});
