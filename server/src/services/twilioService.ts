import crypto from "node:crypto";
import { logDebug, logInfo } from "../utils/logger.js";

export type SmsStatus = "queued" | "sent" | "failed";
export type CallStatus = "queued" | "in-progress" | "completed" | "failed";

export interface SmsMessage {
  sid: string;
  to: string;
  body: string;
  status: SmsStatus;
  queuedAt: string;
  sentAt?: string;
}

export interface CallSession {
  sid: string;
  to: string;
  from: string;
  script: string;
  status: CallStatus;
  queuedAt: string;
  startedAt?: string;
  completedAt?: string;
}

const smsMessages = new Map<string, SmsMessage>();
const callSessions = new Map<string, CallSession>();

/**
 * Sends an SMS message via the Twilio integration and returns the resulting message metadata.
 */
export async function sendSms(to: string, message: string): Promise<SmsMessage> {
  logInfo("sendSms invoked");
  const trimmedMessage = message.trim();
  if (trimmedMessage.length === 0) {
    throw new Error("SMS message cannot be empty");
  }
  logDebug("sendSms payload", { to, message: trimmedMessage });
  const sid = `SM${crypto.randomUUID().replace(/-/g, "")}`;
  const now = new Date().toISOString();
  const sms: SmsMessage = {
    sid,
    to,
    body: trimmedMessage,
    status: "queued",
    queuedAt: now
  };
  smsMessages.set(sid, sms);
  const timer = setTimeout(() => {
    const entry = smsMessages.get(sid);
    if (!entry || entry.status === "failed") {
      return;
    }
    entry.status = "sent";
    entry.sentAt = new Date().toISOString();
  }, 200);
  if (typeof timer.unref === "function") {
    timer.unref();
  }
  return { ...sms };
}

/**
 * Initiates an outbound call using Twilio and returns the resulting call metadata.
 */
export async function initiateCall(to: string, from: string, script: string): Promise<CallSession> {
  logInfo("initiateCall invoked");
  const sanitizedScript = script.trim();
  if (sanitizedScript.length === 0) {
    throw new Error("Call script cannot be empty");
  }
  logDebug("initiateCall payload", { to, from, script: sanitizedScript });
  const sid = `CA${crypto.randomUUID().replace(/-/g, "")}`;
  const now = new Date().toISOString();
  const call: CallSession = {
    sid,
    to,
    from,
    script: sanitizedScript,
    status: "queued",
    queuedAt: now
  };
  callSessions.set(sid, call);
  const startTimer = setTimeout(() => {
    const entry = callSessions.get(sid);
    if (!entry || entry.status === "failed") {
      return;
    }
    entry.status = "in-progress";
    entry.startedAt = new Date().toISOString();
    const completionTimer = setTimeout(() => {
      const activeEntry = callSessions.get(sid);
      if (!activeEntry || activeEntry.status === "failed") {
        return;
      }
      activeEntry.status = "completed";
      activeEntry.completedAt = new Date().toISOString();
    }, 600);
    if (typeof completionTimer.unref === "function") {
      completionTimer.unref();
    }
  }, 200);
  if (typeof startTimer.unref === "function") {
    startTimer.unref();
  }
  return { ...call };
}

/**
 * Retrieves the status of a Twilio interaction by SID.
 */
export async function fetchTwilioStatus(sid: string): Promise<SmsStatus | CallStatus | "not_found"> {
  logInfo("fetchTwilioStatus invoked");
  logDebug("fetchTwilioStatus payload", { sid });
  const sms = smsMessages.get(sid);
  if (sms) {
    return sms.status;
  }
  const call = callSessions.get(sid);
  if (call) {
    return call.status;
  }
  return "not_found";
}
