import request from "supertest";
import { buildAppWithApiRoutes } from "../app";

describe("twilio voice routes", () => {
  const app = buildAppWithApiRoutes();

  beforeAll(() => {
    process.env.TWILIO_ACCOUNT_SID = "ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
    process.env.TWILIO_API_KEY = "SKXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
    process.env.TWILIO_API_SECRET = "test-twilio-api-secret";
    process.env.TWILIO_TWIML_APP_SID = "AP00000000000000000000000000000000";
    process.env.TWILIO_PHONE_NUMBER = "+14155550000";
  });

  it("issues token from /api/twilio/token", async () => {
    const res = await request(app).get("/api/twilio/token");

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe("string");
    expect(res.body.token.length).toBeGreaterThan(100);
  });

  it("returns twiml for /api/twilio/voice", async () => {
    const res = await request(app)
      .post("/api/twilio/voice")
      .send({ To: "+14155550123" });

    expect(res.status).toBe(200);
    expect(res.type).toContain("text/xml");
    expect(res.text).toContain("<Dial");
    expect(res.text).toContain("+14155550123");
  });

  it("accepts /api/twilio/status", async () => {
    const res = await request(app)
      .post("/api/twilio/status")
      .send({ CallSid: "CA123", CallStatus: "completed", Direction: "outbound-api" });

    expect(res.status).toBe(200);
  });
});
