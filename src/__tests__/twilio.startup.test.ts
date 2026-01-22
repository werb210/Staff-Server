describe("twilio startup without configuration", () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
    jest.resetModules();
  });

  it("fails fast when Twilio env vars are missing", () => {
    process.env = { ...originalEnv };
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_VERIFY_SERVICE_SID;
    process.env.PORT = "0";
    process.env.NODE_ENV = "test";

    expect(() => {
      jest.isolateModules(() => {
        require("../index");
      });
    }).toThrow(
      "Missing required environment variables: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID"
    );
  });
});
