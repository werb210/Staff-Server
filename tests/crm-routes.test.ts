import express from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { pool } from "../src/db.js";
import crmRouter from "../src/routes/crm.js";
import { errorHandler } from "../src/middleware/errors.js";

describe("CRM activity routes", () => {
  const token = jwt.sign(
    { id: "user-1", userId: "user-1", role: "Admin", silo: "BF", capabilities: ["crm:read"] },
    "test-secret",
  );

  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret";
    vi.restoreAllMocks();
    vi.spyOn(pool, "query").mockImplementation(async (sql: string) => {
      if (sql.includes("FROM users WHERE id")) {
        return { rows: [{ id: "user-1", email: "admin@bf.test", role: "Admin", silo: "BF", silos: ["BF"] }] } as any;
      }
      if (sql.includes("INSERT INTO crm_notes")) {
        return { rows: [{ id: "note-1", body: "Followed up", contact_id: "contact-1", silo: "BF" }] } as any;
      }
      if (sql.includes("SELECT 'note' AS kind")) {
        return { rows: [{ kind: "note", id: "note-1", ts: new Date().toISOString(), title: null, body: "Followed up", extra: null }] } as any;
      }
      return { rows: [] } as any;
    });
  });

  function app() {
    const a = express();
    a.use(express.json());
    a.use("/api/crm", crmRouter);
    a.use(errorHandler);
    return a;
  }

  it("posts a note and returns timeline", async () => {
    const postRes = await request(app())
      .post("/api/crm/contacts/contact-1/notes")
      .set("Authorization", `Bearer ${token}`)
      .send({ body: "Followed up" });

    expect(postRes.status).toBe(201);
    expect(postRes.body.data.id).toBe("note-1");

    const timelineRes = await request(app())
      .get("/api/crm/contacts/contact-1/timeline")
      .set("Authorization", `Bearer ${token}`);

    expect(timelineRes.status).toBe(200);
    expect(Array.isArray(timelineRes.body.data)).toBe(true);
    expect(timelineRes.body.data[0].kind).toBe("note");
  });
});
