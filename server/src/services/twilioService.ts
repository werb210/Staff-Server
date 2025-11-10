import { logDebug, logInfo } from "../utils/logger.js";

export async function sendSms(to: string, message: string): Promise<boolean> {
  logInfo("sendSms invoked");
  logDebug("sendSms payload", { to, message });
  return true;
}

export async function initiateCall(to: string, from: string, script: string): Promise<string> {
  logInfo("initiateCall invoked");
  logDebug("initiateCall payload", { to, from, script });
  return `CALL-${Date.now()}`;
}

export async function fetchTwilioStatus(sid: string): Promise<string> {
  logInfo("fetchTwilioStatus invoked");
  logDebug("fetchTwilioStatus payload", { sid });
  return "queued";
}
