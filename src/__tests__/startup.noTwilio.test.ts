describe("startup without Twilio configuration", () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
    jest.resetModules();
  });

  it("imports the server and reports Twilio disabled", () => {
    process.env = { ...originalEnv, NODE_ENV: "test" };
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_VERIFY_SERVICE_SID;

    expect(() => {
      jest.isolateModules(() => {
        require("../index");
        const { isTwilioEnabled } = require("../services/twilio");
        expect(isTwilioEnabled()).toBe(false);
      });
    }).not.toThrow();
  });
});
