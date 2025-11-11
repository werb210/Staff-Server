import { emailService } from "../services/emailService.js";

describe("emailService", () => {
  it("queues outbound emails", () => {
    const email = emailService.sendEmail({
      to: "borrower@example.com",
      subject: "Hello",
      body: "Welcome",
    });

    expect(email.status).toBe("sent");
    expect(emailService.listEmails()).toContainEqual(email);
  });
});
