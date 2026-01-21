import request from "supertest";
import app from "../../src/app";

describe("OTP start contract", () => {
  it("returns sid on success", async () => {
    const res = await request(app)
      .post("/api/auth/otp/start")
      .send({ phone: "+15878881837" });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.sid).toBeDefined();
  });
});
