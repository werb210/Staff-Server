// server/src/services/notificationsService.ts

import emailService from "./emailService.js";
import smsService from "./smsService.js";

const notificationsService = {
  async list() {
    return {
      sms: await smsService.list(),
      emails: await emailService.list(),
    };
  },
};

export default notificationsService;
