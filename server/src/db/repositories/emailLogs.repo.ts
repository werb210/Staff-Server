import { randomUUID } from "crypto";

type EmailLog = {
  id: string;
  to: string;
  subject: string;
  body: string;
  createdAt: Date;
};

const emailLogs: EmailLog[] = [];

export const emailLogsRepo = {
  async insert(entry: Omit<EmailLog, "id">) {
    const record: EmailLog = { id: randomUUID(), ...entry };
    emailLogs.push(record);
    return record;
  },

  async list() {
    return [...emailLogs];
  }
};

export default emailLogsRepo;
