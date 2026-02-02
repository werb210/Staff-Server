import AccessToken from "twilio/lib/jwt/AccessToken";
import { AppError } from "../../middleware/errors";
import { logError } from "../../observability/logger";
import { normalizePhoneNumber } from "../auth/phone";
import { startCall, updateCallStatus } from "../calls/calls.service";
import { findCallLogByTwilioSid } from "../calls/calls.repo";
import { getTwilioClient } from "../../services/twilio";
import { type CallStatus, type CallLogRecord } from "../calls/calls.repo";

const VOICE_TOKEN_TTL_SECONDS = 15 * 60;

function requireVoiceEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new AppError("twilio_misconfigured", "Twilio voice is not configured.", 500);
  }
  return value.trim();
}

function getVoiceConfig(): {
  accountSid: string;
  apiKey: string;
  apiSecret: string;
  applicationSid: string;
  callerId: string;
} {
  return {
    accountSid: requireVoiceEnv("TWILIO_ACCOUNT_SID"),
    apiKey: requireVoiceEnv("TWILIO_API_KEY"),
    apiSecret: requireVoiceEnv("TWILIO_API_SECRET"),
    applicationSid: requireVoiceEnv("TWILIO_VOICE_APP_SID"),
    callerId: requireVoiceEnv("TWILIO_VOICE_CALLER_ID"),
  };
}

function normalizeTwilioError(error: unknown): { message: string; code?: string | number } {
  if (error && typeof error === "object") {
    const err = error as { message?: unknown; code?: unknown };
    return {
      message: typeof err.message === "string" ? err.message : "Twilio error",
      code:
        typeof err.code === "string" || typeof err.code === "number"
          ? err.code
          : undefined,
    };
  }
  if (error instanceof Error) {
    return { message: error.message };
  }
  return { message: "Twilio error" };
}

export function issueVoiceToken(params: { userId: string }): string {
  const { accountSid, apiKey, apiSecret, applicationSid } = getVoiceConfig();

  const token = new AccessToken(accountSid, apiKey, apiSecret, {
    identity: params.userId,
    ttl: VOICE_TOKEN_TTL_SECONDS,
  });

  const voiceGrant = new AccessToken.VoiceGrant({
    outgoingApplicationSid: applicationSid,
  });

  token.addGrant(voiceGrant);

  return token.toJwt();
}

export async function startVoiceCall(params: {
  phoneNumber: string;
  staffUserId: string | null;
  crmContactId?: string | null;
  applicationId?: string | null;
  ip?: string;
  userAgent?: string;
}): Promise<{ callSid: string; call: CallLogRecord }> {
  const normalizedPhone = normalizePhoneNumber(params.phoneNumber);
  if (!normalizedPhone) {
    throw new AppError("invalid_phone", "Phone number must be in E.164 format.", 400);
  }

  const { callerId, applicationSid } = getVoiceConfig();

  let callSid: string;
  try {
    const client = getTwilioClient();
    const call = await client.calls.create({
      to: normalizedPhone,
      from: callerId,
      applicationSid,
    });
    callSid = call.sid;
  } catch (error) {
    const details = normalizeTwilioError(error);
    logError("voice_call_start_failed", {
      error: details.message,
      code: details.code,
      phoneNumber: normalizedPhone,
      staffUserId: params.staffUserId,
    });
    throw new AppError("twilio_error", "Unable to start call.", 502);
  }

  const call = await startCall({
    phoneNumber: normalizedPhone,
    direction: "outbound",
    status: "initiated",
    staffUserId: params.staffUserId,
    twilioCallSid: callSid,
    crmContactId: params.crmContactId ?? null,
    applicationId: params.applicationId ?? null,
    ip: params.ip,
    userAgent: params.userAgent,
  });

  return { callSid, call };
}

export async function endVoiceCall(params: {
  callSid: string;
  status?: CallStatus;
  durationSeconds?: number | null;
  staffUserId: string | null;
  ip?: string;
  userAgent?: string;
}): Promise<CallLogRecord> {
  const finalStatus: CallStatus = params.status ?? "completed";

  const callLog = await findCallLogByTwilioSid(params.callSid);
  if (!callLog) {
    throw new AppError("not_found", "Call not found.", 404);
  }

  try {
    const client = getTwilioClient();
    await client.calls(params.callSid).update({ status: "completed" });
  } catch (error) {
    const details = normalizeTwilioError(error);
    logError("voice_call_end_failed", {
      error: details.message,
      code: details.code,
      callSid: params.callSid,
      staffUserId: params.staffUserId,
    });
    throw new AppError("twilio_error", "Unable to end call.", 502);
  }

  const endedAt = new Date();
  const durationSeconds =
    params.durationSeconds ??
    (callLog.created_at
      ? Math.max(0, Math.round((endedAt.getTime() - callLog.created_at.getTime()) / 1000))
      : undefined);

  const updated = await updateCallStatus({
    id: callLog.id,
    status: finalStatus,
    durationSeconds,
    ip: params.ip,
    userAgent: params.userAgent,
  });

  return updated;
}
