import { smsService } from "./smsService.js";

export const notificationService = {
  async sendSMS(to: string, message: string) {
    return smsService.send(to, message);
  }
};
