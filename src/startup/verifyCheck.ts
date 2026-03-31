import { twilioClient, verifyServiceSid } from "../lib/twilioClient";

export async function verifyTwilioSetup() {
  try {
    await twilioClient.verify.v2.services(verifyServiceSid).fetch();
    console.log("Twilio Verify OK");
  } catch (err) {
    console.error("Twilio Verify FAILED");
    process.exit(1);
  }
}
