import { twilioClient } from "./twilioClient";

export async function createConference(conferenceId: string) {
  return (twilioClient.conferences ).create({
    friendlyName: conferenceId,
  });
}

export async function addParticipant(conferenceId: string, to: string) {
  return twilioClient.conferences(conferenceId).participants.create({
    to,
    from: process.env.TWILIO_PHONE_NUMBER!,
  });
}
