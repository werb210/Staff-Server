export interface SmsPayload {
  to: string;
  from: string;
  body: string;
}

export interface CallPayload {
  to: string;
  from: string;
  subject: string;
}

class TwilioService {
  sendSms(payload: SmsPayload): { message: string; sid: string } {
    return {
      message: `SMS to ${payload.to} queued`,
      sid: `SM${Date.now()}`
    };
  }

  initiateCall(payload: CallPayload): { message: string; sid: string } {
    return {
      message: `Call to ${payload.to} regarding ${payload.subject} scheduled`,
      sid: `CA${Date.now()}`
    };
  }
}

export const twilioService = new TwilioService();
