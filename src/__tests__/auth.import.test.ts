describe("startup twilio config", () => {
  it("crashes app if TWILIO_AUTH_TOKEN missing", () => {
    const originalEnv = process.env;
    process.env = { ...originalEnv };
    delete process.env.TWILIO_AUTH_TOKEN;
    process.env.TWILIO_ENABLED = "true";

    jest.resetModules();

    expect(() => {
      jest.isolateModules(() => {
        require("../config/twilio");
      });
    }).toThrow();

    process.env = originalEnv;
  });
});
