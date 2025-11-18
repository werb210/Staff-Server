// server/src/services/communicationService.ts
type SMSPayload = { to: string; message: string };
type EmailPayload = { to: string; subject: string; body: string };

export const communicationService = {
  async listSMS() {
    return [{ id: 1, msg: "Hello world", ts: Date.now() }];
  },

  async listEmails() {
    return [{ id: 1, subject: "Test Email", ts: Date.now() }];
  },

  async sendSMS(payload: SMSPayload) {
    return { status: "sent", ...payload, ts: Date.now() };
  },

  async sendEmail(payload: EmailPayload) {
    return { status: "sent", ...payload, ts: Date.now() };
  },
};

export default communicationService;
