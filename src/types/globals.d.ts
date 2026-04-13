type OtpStoreRecord = {
  code: string;
  verified: boolean;
};

declare global {
  // eslint-disable-next-line no-var
  var __otpStore: Record<string, OtpStoreRecord> | undefined;
}

export {};
