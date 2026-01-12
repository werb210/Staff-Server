import { startOtp } from "../modules/auth/auth.service";

describe("startOtp env validation", () => {
  it("throws when called without Twilio env vars", async () => {
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_VERIFY_SERVICE_SID;

    await expect(startOtp("+15555555555")).rejects.toThrow(
      /Missing Twilio env vars/
    );
  });
});
