export interface SmsMessage {
  sid: string;
  to: string;
  body: string;
}

export interface CallLog {
  sid: string;
  to: string;
  from: string;
  status: "completed" | "queued";
}

/**
 * Stub Twilio service returning predefined SMS and call data.
 */
class TwilioService {
  private readonly smsMessages: SmsMessage[] = [
    {
      sid: "SM123",
      to: "+15551234567",
      body: "Your application has been received"
    }
  ];

  private readonly callLogs: CallLog[] = [
    {
      sid: "CA123",
      to: "+15557654321",
      from: "+15559876543",
      status: "completed"
    }
  ];

  listSmsMessages(): SmsMessage[] {
    return [...this.smsMessages];
  }

  listCallLogs(): CallLog[] {
    return [...this.callLogs];
  }
}

export const twilioService = new TwilioService();
