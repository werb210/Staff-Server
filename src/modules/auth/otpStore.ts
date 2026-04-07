type OTPRecord = {
  code: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
  used: boolean;
};

type OtpGlobalStore = Record<string, OTPRecord>;

const globalScope = globalThis as typeof globalThis & {
  __BF_OTP_STORE__?: OtpGlobalStore;
};

const store = globalScope.__BF_OTP_STORE__ ||= {};
const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_OTP_STORE_ITEMS = 1000;

export const otpStore = {
  set(phone: string, record: OTPRecord) {
    store[phone] = record;
    setTimeout(() => {
      delete store[phone];
    }, OTP_TTL_MS).unref();

    const keys = Object.keys(store);
    if (keys.length > MAX_OTP_STORE_ITEMS) {
      const firstKey = keys[0];
      if (firstKey) {
        delete store[firstKey];
      }
    }
  },
  get(phone: string) {
    return store[phone];
  },
  delete(phone: string) {
    delete store[phone];
  },
  clear() {
    for (const key of Object.keys(store)) {
      delete store[key];
    }
  },
  records() {
    return store;
  },
};

export type { OTPRecord };
