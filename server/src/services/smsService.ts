// server/src/services/smsService.ts
import crypto from "crypto";

export const smsService = {
  async list() {
    return [
      { id: 1, msg: "Test SMS", to: "+15555555555", ts: Date.now() },
    ];
  },

  async send(to: string, msg: string) {
    const sid = crypto.randomUUID();

    return {
      ok: true,
      sid,
      id: sid,
      to,
      msg,
      ts: Date.now(),
    };
  },
};
