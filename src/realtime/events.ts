import { EventEmitter } from "events";

export const realtimeEvents = new EventEmitter();

export type EscalationEvent = {
  sessionId: string;
  escalatedTo: string | null;
  triggeredBy: string | null;
  timestamp: string;
};

export function emitAiEscalation(event: EscalationEvent): void {
  realtimeEvents.emit("ai:escalated", event);
}
