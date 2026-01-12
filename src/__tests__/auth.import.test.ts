describe("startup twilio config", () => {
  it("throws on import when TWILIO_AUTH_TOKEN missing", () => {
    const originalEnv = process.env;
    process.env = { ...originalEnv };
    delete process.env.TWILIO_AUTH_TOKEN;

    jest.resetModules();

    expect(() => {
      jest.isolateModules(() => {
        require("../services/twilio");
      });
    }).toThrow("Missing required Twilio environment variables");

    process.env = originalEnv;
  });
});
