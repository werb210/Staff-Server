import { randomUUID } from "crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ROLES } from "../../auth/roles";
import { pool } from "../../db";
import { createTestServer } from "../../server/testServer";
import { seedLenderProduct } from "../helpers/lenders";
import { seedUser } from "../helpers/users";

let server: Awaited<ReturnType<typeof createTestServer>>;
let phoneCounter = 5000;

const nextPhone = (): string =>
  `+1415555${String(phoneCounter++).padStart(4, "0")}`;

describe("client-to-portal e2e", () => {
  beforeAll(async () => {
    server = await createTestServer();
  });

  afterAll(async () => {
    await server.close();
  });

  it("runs the client submission through document availability", async () => {
    await seedLenderProduct({
      category: "LOC",
      country: "US",
      requiredDocuments: [{ type: "government_id", required: true }],
    });
    const phone = nextPhone();
    const email = `e2e-${phone.replace(/\D/g, "")}@example.com`;
    await seedUser({ phoneNumber: phone, role: ROLES.STAFF, email });

    const loginRes = await request(server.url).post("/api/auth/login").send({
      phone,
      code: "123456",
    });

    expect(loginRes.status).toBe(200);
    const token = loginRes.body.accessToken as string;

    const applicationRes = await request(server.url)
      .post("/api/applications")
      .set("Authorization", `Bearer ${token}`)
      .send({
        source: "client",
        country: "US",
        productCategory: "LOC",
        business: { legalName: "E2E Ventures LLC" },
        applicant: {
          firstName: "Eli",
          lastName: "Stone",
          email: "eli.stone@example.com",
        },
        financialProfile: { revenue: 210000 },
        match: { partner: "direct", submissionId: randomUUID() },
      });

    expect(applicationRes.status).toBe(201);
    const applicationId = applicationRes.body.applicationId as string;

    const uploadRes = await request(server.url)
      .post("/api/documents")
      .set("Authorization", `Bearer ${token}`)
      .field("applicationId", applicationId)
      .field("category", "government_id")
      .attach("file", Buffer.from("%PDF-1.4\n%e2e"), { filename: "statement.pdf", contentType: "application/pdf" });

    expect(uploadRes.status).toBe(201);
    const documentId = uploadRes.body.documentId as string;

    const ocrJobs = await pool.query<{ count: number }>(
      "select count(*)::int as count from document_processing_jobs where document_id = $1",
      [documentId]
    );
    expect(ocrJobs.rows[0]?.count ?? 0).toBe(1);

    const fetchRes = await request(server.url)
      .get(`/api/applications/${applicationId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(fetchRes.status).toBe(200);
    expect(fetchRes.body.application.pipelineState).toBeDefined();

    const documentsRes = await request(server.url)
      .get(`/api/applications/${applicationId}/documents`)
      .set("Authorization", `Bearer ${token}`);

    expect(documentsRes.status).toBe(200);
    const documents = documentsRes.body.documents as unknown[];
    expect(Array.isArray(documents)).toBe(true);
  });
});
