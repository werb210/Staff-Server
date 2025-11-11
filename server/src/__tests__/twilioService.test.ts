import { twilioService } from "../services/twilioService.js";

describe("twilioService", () => {
  it("stores SMS messages", () => {
    const message = twilioService.sendSms("+15551234567", "Hello world");
    expect(message.status).toBe("sent");
    expect(twilioService.listMessages()[0]).toEqual(message);
  });

  it("logs call events", () => {
    const call = twilioService.logCall("+15551234567", "+15557654321", 60, "completed", "Test call");
    expect(call.outcome).toBe("completed");
    expect(twilioService.listCalls()).toContainEqual(call);
  });
});
