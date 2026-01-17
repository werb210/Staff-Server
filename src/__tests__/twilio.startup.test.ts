describe("twilio startup without configuration", () => {
  const originalEnv = process.env;
  let server: import("http").Server | null = null;

  afterEach(async () => {
    if (!server) {
      return;
    }
    await new Promise<void>((resolve) => {
      server?.close(() => resolve());
    });
    server = null;
    process.env = originalEnv;
  });

  it("boots without Twilio env vars", async () => {
    process.env = { ...originalEnv };
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_VERIFY_SERVICE_SID;
    process.env.PORT = "0";
    process.env.NODE_ENV = "test";

    jest.resetModules();
    await new Promise<void>((resolve, reject) => {
      jest.isolateModules(() => {
        const { startServer } = require("../index");
        const { getTwilioClient, isTwilioEnabled } = require("../services/twilio");
        expect(isTwilioEnabled()).toBe(false);
        expect(getTwilioClient()).toBeNull();
        startServer()
          .then((listener: import("http").Server) => {
            server = listener;
            resolve();
          })
          .catch(reject);
      });
    });

    if (!server?.listening) {
      await new Promise<void>((resolve) => {
        server?.once("listening", resolve);
      });
    }
    expect(server?.listening).toBe(true);

  });
});
