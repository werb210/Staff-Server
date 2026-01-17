it("initializes Twilio client when credentials present", async () => {
  process.env.TWILIO_ACCOUNT_SID = "ACxxxx";
  process.env.TWILIO_AUTH_TOKEN = "token";
  process.env.TWILIO_VERIFY_SERVICE_SID = "VA00000000000000000000000000000000";
  const {
    getTwilioClient,
    twilioClient,
    VERIFY_SERVICE_SID,
  } = require("../services/twilio");
  expect(twilioClient).toBeNull();
  expect(getTwilioClient()).toBeDefined();
  expect(VERIFY_SERVICE_SID).toBe("VA00000000000000000000000000000000");
});
