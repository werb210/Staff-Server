import { createHmac } from "crypto";
import request from "supertest";
import app from "../index.js";

const siloHeader = "BF";

const authenticate = async () => {
  const challenge = "jest-smoke-test";
  const signature = createHmac("sha256", "bf-public-key:bf-secret")
    .update(challenge)
    .digest("hex");

  const response = await request(app)
    .post("/api/auth/passkey")
    .set("x-silo", siloHeader)
    .send({
      credentialId: "bf-cred-1",
      challenge,
      signature,
    });

  return response.body.session.token as string;
};

let bearerToken: string;

beforeAll(async () => {
  bearerToken = await authenticate();
});

const withAuth = (req: request.Test) =>
  req.set("x-silo", siloHeader).set("Authorization", `Bearer ${bearerToken}`);

describe("API smoke tests", () => {
  it("returns health", async () => {
    const response = await request(app).get("/api/health").set("x-silo", siloHeader);
    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Service healthy");
  });

  it("lists applications", async () => {
    const response = await withAuth(request(app).get("/api/applications"));
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it("creates application via API", async () => {
    const payload = {
      applicantName: "API Tester",
      applicantEmail: "api@tester.com",
      loanAmount: 50000,
      loanPurpose: "Expansion",
      productId: "385ca198-5b56-4587-a5b4-947ca9b61930",
    };
    const response = await withAuth(request(app).post("/api/applications")).send(
      payload,
    );
    expect(response.status).toBe(201);
    expect(response.body.data.applicantName).toBe("API Tester");
  });

  it("fetches documents", async () => {
    const response = await withAuth(request(app).get("/api/documents"));
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it("provides lender reports", async () => {
    const response = await withAuth(
      request(app).get("/api/lenders/reports/summary"),
    );
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
  });
});
