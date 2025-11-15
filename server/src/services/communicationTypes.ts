export const CommunicationType = {
  CALL: "CALL",
  EMAIL: "EMAIL",
  SMS: "SMS",
} as const;

export type CommunicationType = (typeof CommunicationType)[keyof typeof CommunicationType];

export const CommunicationDirection = {
  INBOUND: "INBOUND",
  OUTBOUND: "OUTBOUND",
} as const;

export type CommunicationDirection =
  (typeof CommunicationDirection)[keyof typeof CommunicationDirection];
