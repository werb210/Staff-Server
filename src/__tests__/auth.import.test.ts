describe("startup twilio config", () => {
  it("does not throw on import when TWILIO_AUTH_TOKEN missing", () => {
    const originalEnv = process.env;
    process.env = { ...originalEnv };
    delete process.env.TWILIO_AUTH_TOKEN;

    jest.resetModules();

    jest.isolateModules(() => {
      const {
        getTwilioClient,
        isTwilioEnabled,
        twilioClient,
      } = require("../services/twilio");
      expect(isTwilioEnabled()).toBe(false);
      expect(twilioClient).toBeNull();
      expect(getTwilioClient()).toBeNull();
    });

    process.env = originalEnv;
  });
});
