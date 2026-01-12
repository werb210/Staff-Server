it("marks Twilio available when credentials present even if Verify SID invalid", async () => {
  process.env.TWILIO_ACCOUNT_SID = "ACxxxx";
  process.env.TWILIO_AUTH_TOKEN = "token";
  process.env.TWILIO_VERIFY_SERVICE_SID = "SV-invalid";
  const { getTwilioClient } = require("../config/twilio");
  const { available } = getTwilioClient();
  expect(available).toBe(true);
});
