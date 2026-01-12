describe("auth.service import safety", () => {
  it("does not throw on import without Twilio env vars", () => {
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_VERIFY_SERVICE_SID;

    expect(() => {
      require("../modules/auth/auth.service");
    }).not.toThrow();
  });
});
