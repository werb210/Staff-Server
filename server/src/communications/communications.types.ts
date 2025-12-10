export type CommunicationType = "sms" | "chat" | "voice";

export type SmsDirection = "incoming" | "outgoing";
export type ChatDirection = "client" | "staff";

export interface CommunicationRecord {
  id: string;
  applicationId: string | null;
  type: CommunicationType;
  direction: string;
  body: string;
  from: string;
  to: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}
