import twilio from "twilio";
import type { Silo } from "../types/index.js";

let twilioClient: ReturnType<typeof twilio> | null = null;

export function getTwilioClient() {
  if (!twilioClient) {
    const sid = process.env.TWILIO_SID;
    const authToken = process.env.TWILIO_AUTH;

    if (!sid || !authToken) {
      throw new Error("Twilio credentials are not configured");
    }

    twilioClient = twilio(sid, authToken);
  }

  return twilioClient;
}

export function resolveNumberForSilo(silo: Silo): string {
  switch (silo) {
    case "SLF":
      return "+17753146801";
    case "BI":
      return "+18254511768"; // placeholder until BI number is provisioned
    case "BF":
    default:
      return "+18254511768";
  }
}
