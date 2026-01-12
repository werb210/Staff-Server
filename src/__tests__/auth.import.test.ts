describe("startup twilio config", () => {
  it("does not crash app if TWILIO_AUTH_TOKEN missing", () => {
    const originalEnv = process.env;
    process.env = { ...originalEnv };
    delete process.env.TWILIO_AUTH_TOKEN;

    jest.resetModules();

    let loaded = false;
    jest.isolateModules(() => {
      const twilioConfig = require("../config/twilio");
      loaded = true;
      expect(twilioConfig.twilioAvailable).toBe(false);
    });

    expect(loaded).toBe(true);

    process.env = originalEnv;
  });
});
