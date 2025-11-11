import request from "supertest";
import app from "../index.js";

describe("API smoke tests", () => {
  it("returns health", async () => {
    const response = await request(app).get("/api/health");
    expect(response.status).toBe(200);
    expect(response.body.message).toBe("OK");
  });

  it("lists applications", async () => {
    const response = await request(app).get("/api/applications");
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
    const response = await request(app).post("/api/applications").send(payload);
    expect(response.status).toBe(201);
    expect(response.body.data.applicantName).toBe("API Tester");
  });

  it("fetches documents", async () => {
    const response = await request(app).get("/api/documents");
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it("provides lender reports", async () => {
    const response = await request(app).get("/api/lenders/reports");
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
  });
});
