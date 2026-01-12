it("does not crash when TWILIO_AUTH_TOKEN is missing", async () => {
  delete process.env.TWILIO_AUTH_TOKEN;
  const app = require("../app");
  expect(app).toBeDefined();
});
