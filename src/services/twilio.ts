import process from "node:process"
import Twilio from "twilio"
import { config } from "../config";

let client: any | null = null

function assertTwilioConfigured() {
  if (
    !process.env.TWILIO_ACCOUNT_SID
    || !process.env.TWILIO_AUTH_TOKEN
    || !process.env.TWILIO_VERIFY_SERVICE_SID
  ) {
    throw new Error("Missing Twilio config");
  }
}

function fetchClient() {
  assertTwilioConfigured();

  if (!client) {
    client = Twilio(
      config.twilio.accountSid!,
      config.twilio.authToken!
    )
  }

  return client
}

export function fetchTwilioClient() {
  return fetchClient()
}

export function fetchVerifyServiceSid() {
  assertTwilioConfigured();

  return config.twilio.verifyServiceSid as string
}

export async function startVerification(phone: string) {
  const twilio = fetchClient()

  return twilio.verify.v2
    .services(fetchVerifyServiceSid())
    .verifications.create({
      to: phone,
      channel: "sms",
    })
}

export async function checkVerification(phone: string, code: string) {
  const twilio = fetchClient()

  return twilio.verify.v2
    .services(fetchVerifyServiceSid())
    .verificationChecks.create({
      to: phone,
      code,
    })
}
